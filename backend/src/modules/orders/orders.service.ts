import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import {
  createCheckoutParams,
  type PayhereCheckoutParams,
} from '../../services/payhere.service';

// ─── Prisma include shape ─────────────────────────────────────────────────────

const ORDER_INCLUDE = {
  items: {
    include: {
      part: { select: { id: true, name: true } },
      shop: { select: { id: true, name: true, slug: true } },
    },
  },
  customer: { select: { id: true, fullName: true, email: true, phone: true } },
} as const;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  partId: string;
  quantity: number;
}

interface ShippingAddress {
  line1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}

export interface CreateOrderInput {
  customerId: string;
  items: CartItem[];
  shippingAddress?: ShippingAddress | null;
}

export interface CreateOrderResult {
  order: OrderWithRelations;
  checkout: PayhereCheckoutParams;
}

// ─── Create order ─────────────────────────────────────────────────────────────

/**
 * Create an order in a serializable transaction that:
 * 1. Fetches and validates each cart item (active, in-stock, approved shop)
 * 2. Locks unit_price, commission_rate, commission_amount per line item
 *    so historical orders are immutable even after shop rate changes
 * 3. Decrements stock atomically
 * 4. Builds PayHere checkout params for the frontend redirect
 */
export async function createOrder(
  input: CreateOrderInput,
  customerFullName: string,
  customerEmail: string,
  customerPhone: string,
): Promise<CreateOrderResult> {
  const order = await prisma.$transaction(
    async (tx) => {
      // ── Validate + fetch all parts ──────────────────────────────────────────
      const partIds = input.items.map((i) => i.partId);
      const parts = await tx.sparePart.findMany({
        where: { id: { in: partIds } },
        include: { shop: true },
      });

      if (parts.length !== partIds.length) {
        const missing = partIds.filter((id) => !parts.find((p) => p.id === id));
        throw ApiError.notFound(`Parts not found: ${missing.join(', ')}`);
      }

      for (const part of parts) {
        if (!part.isActive) {
          throw ApiError.badRequest(`Part "${part.name}" is no longer available`);
        }
        if (part.shop.status !== 'APPROVED') {
          throw ApiError.badRequest(`Shop for part "${part.name}" is not active`);
        }
      }

      // ── Stock check + compute lines ─────────────────────────────────────────
      const lines = input.items.map((item) => {
        const part = parts.find((p) => p.id === item.partId)!;
        if (part.stockQuantity < item.quantity) {
          throw ApiError.conflict(
            `Insufficient stock for "${part.name}" (requested ${item.quantity}, available ${part.stockQuantity})`,
          );
        }
        const unitPrice = Number(part.price.toString());
        const commissionRate = Number(part.shop.commissionRate.toString());
        const lineTotal = unitPrice * item.quantity;
        const commissionAmount = (lineTotal * commissionRate) / 100;
        return { item, part, unitPrice, commissionRate, lineTotal, commissionAmount };
      });

      const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

      // ── Create Order ────────────────────────────────────────────────────────
      const newOrder = await tx.order.create({
        data: {
          customerId: input.customerId,
          status: OrderStatus.PENDING,
          subtotal,
          total: subtotal,
          currency: 'LKR',
          shippingAddress: (input.shippingAddress as Prisma.InputJsonValue | null | undefined) ?? Prisma.JsonNull,
        },
      });

      // ── Create OrderItems + decrement stock ─────────────────────────────────
      await Promise.all(
        lines.map((l) =>
          tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              partId: l.item.partId,
              shopId: l.part.shopId,
              quantity: l.item.quantity,
              unitPrice: l.unitPrice,
              commissionRate: l.commissionRate,
              commissionAmount: l.commissionAmount,
              lineTotal: l.lineTotal,
            },
          }),
        ),
      );

      await Promise.all(
        lines.map((l) =>
          tx.sparePart.update({
            where: { id: l.item.partId },
            data: { stockQuantity: { decrement: l.item.quantity } },
          }),
        ),
      );

      return newOrder;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );

  // Reload with full relations for response
  const full = (await prisma.order.findUnique({
    where: { id: order.id },
    include: ORDER_INCLUDE,
  }))!;

  // Build PayHere checkout params
  const itemSummary = full.items
    .map((i) => `${i.part.name} x${i.quantity}`)
    .join(', ')
    .slice(0, 200);

  const checkout = createCheckoutParams({
    orderId: full.id,
    amount: Number(order.total.toString()),
    description: itemSummary || `OldTrailBikes Order`,
    customerFullName,
    customerEmail,
    customerPhone: customerPhone ?? '',
    shippingAddress: (input.shippingAddress as { line1?: string } | null | undefined)?.line1,
    shippingCity: (input.shippingAddress as { city?: string } | null | undefined)?.city,
  });

  return { order: full, checkout };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getOrder(
  id: string,
  opts: { customerId?: string; isAdmin?: boolean } = {},
): Promise<OrderWithRelations> {
  const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!order) throw ApiError.notFound('Order not found');
  if (!opts.isAdmin && order.customerId !== opts.customerId) {
    throw ApiError.forbidden('You do not have access to this order');
  }
  return order;
}

export async function listMyOrders(
  customerId: string,
  params: { status?: OrderStatus; page?: number; pageSize?: number },
): Promise<{ items: OrderWithRelations[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const where: Prisma.OrderWhereInput = {
    customerId,
    ...(params.status ? { status: params.status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.order.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function listAllOrders(params: {
  status?: OrderStatus; page?: number; pageSize?: number;
}): Promise<{ items: OrderWithRelations[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const where: Prisma.OrderWhereInput = params.status ? { status: params.status } : {};
  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.order.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function listShopSales(
  shopId: string,
  params: { page?: number; pageSize?: number },
): Promise<{ items: Prisma.OrderItemGetPayload<{ include: { order: true; part: { select: { id: true; name: true } } } }>[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const where: Prisma.OrderItemWhereInput = { shopId, order: { status: 'PAID' } };
  const include = { order: true, part: { select: { id: true, name: true } } } as const;
  const [items, total] = await Promise.all([
    prisma.orderItem.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.orderItem.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

// ─── PayHere webhook helpers ──────────────────────────────────────────────────

export async function markOrderPaid(
  orderId: string,
  paymentReference: string,
): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.PAID, paidAt: new Date(), paymentReference },
  });
}

export async function markOrderFailed(orderId: string): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.FAILED },
  });
}

export async function markOrderRefunded(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  // Restore stock on refund
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.REFUNDED, refundedAt: new Date() } });
    const items = await tx.orderItem.findMany({ where: { orderId } });
    await Promise.all(
      items.map((item) =>
        tx.sparePart.update({
          where: { id: item.partId },
          data: { stockQuantity: { increment: item.quantity } },
        }),
      ),
    );
  });
}
