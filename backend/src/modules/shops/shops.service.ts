import { ShopStatus, UserRole, type Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { cacheGet, cacheSet, cacheDel } from '../../services/redis-cache.service';

const SHOP_INCLUDE = {
  owner: { select: { id: true, fullName: true, email: true } },
  approvedBy: { select: { id: true, fullName: true } },
} as const;

export type ShopWithRelations = Prisma.ShopGetPayload<{ include: typeof SHOP_INCLUDE }>;

const SHOPS_CACHE_TTL = 60 * 60; // 1 h

// ─── Public ───────────────────────────────────────────────────────────────────

export async function listApprovedShops(
  params: { page?: number; pageSize?: number } = {},
): Promise<{ items: ShopWithRelations[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const cacheKey = `shops:approved:p${page}:s${pageSize}`;

  const cached = await cacheGet<{ items: ShopWithRelations[]; total: number; page: number; pageSize: number }>(cacheKey);
  if (cached) return cached;

  const where: Prisma.ShopWhereInput = { status: ShopStatus.APPROVED };
  const [items, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      include: SHOP_INCLUDE,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.shop.count({ where }),
  ]);

  const result = { items, total, page, pageSize };
  await cacheSet(cacheKey, result, SHOPS_CACHE_TTL);
  return result;
}

export async function getShopBySlug(slug: string): Promise<ShopWithRelations> {
  const shop = await prisma.shop.findUnique({ where: { slug }, include: SHOP_INCLUDE });
  if (!shop || shop.status !== ShopStatus.APPROVED) throw ApiError.notFound('Shop not found');
  return shop;
}

// ─── Shop owner ───────────────────────────────────────────────────────────────

export async function applyForShop(
  ownerUserId: string,
  input: {
    name: string;
    slug: string;
    description?: string;
    contactEmail: string;
    contactPhone: string;
    address?: string;
  },
): Promise<ShopWithRelations> {
  const existing = await prisma.shop.findFirst({ where: { ownerUserId } });
  if (existing) throw ApiError.conflict('You already have a shop application on this account');

  const shop = await prisma.shop.create({
    data: {
      ownerUserId,
      ...input,
      commissionRate: 10, // platform default; admin can adjust before approval
      status: ShopStatus.PENDING,
    },
    include: SHOP_INCLUDE,
  });

  return shop;
}

export async function getMyShop(ownerUserId: string): Promise<ShopWithRelations> {
  const shop = await prisma.shop.findUnique({ where: { ownerUserId }, include: SHOP_INCLUDE });
  if (!shop) throw ApiError.notFound('No shop found for this account');
  return shop;
}

export async function updateMyShop(
  ownerUserId: string,
  input: {
    name?: string;
    description?: string | null;
    contactEmail?: string;
    contactPhone?: string;
    address?: string | null;
  },
): Promise<ShopWithRelations> {
  const shop = await prisma.shop.findUnique({ where: { ownerUserId } });
  if (!shop) throw ApiError.notFound('No shop found for this account');
  if (shop.status === ShopStatus.SUSPENDED) throw ApiError.forbidden('Shop is suspended');

  const updated = await prisma.shop.update({
    where: { ownerUserId },
    data: input,
    include: SHOP_INCLUDE,
  });

  await cacheDel(`shops:approved:p1:s20`);
  return updated;
}

export async function getShopDashboard(ownerUserId: string): Promise<{
  shop: ShopWithRelations;
  totalRevenue: number;
  totalCommission: number;
  orderCount: number;
}> {
  const shop = await prisma.shop.findUnique({ where: { ownerUserId }, include: SHOP_INCLUDE });
  if (!shop) throw ApiError.notFound('No shop found for this account');
  if (shop.status !== ShopStatus.APPROVED) throw ApiError.forbidden('Shop is not approved');

  const stats = await prisma.orderItem.aggregate({
    where: { shopId: shop.id, order: { status: 'PAID' } },
    _sum: { lineTotal: true, commissionAmount: true },
    _count: { id: true },
  });

  return {
    shop,
    totalRevenue: Number(stats._sum.lineTotal ?? 0),
    totalCommission: Number(stats._sum.commissionAmount ?? 0),
    orderCount: stats._count.id,
  };
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function listPendingShops(): Promise<ShopWithRelations[]> {
  return prisma.shop.findMany({
    where: { status: ShopStatus.PENDING },
    include: SHOP_INCLUDE,
    orderBy: { createdAt: 'asc' },
  });
}

export async function approveShop(
  shopId: string,
  adminId: string,
): Promise<ShopWithRelations> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw ApiError.notFound('Shop not found');
  if (shop.status === ShopStatus.APPROVED) throw ApiError.conflict('Shop is already approved');

  // Approve shop AND upgrade the owner's role to SHOP in one transaction.
  const [updated] = await prisma.$transaction([
    prisma.shop.update({
      where: { id: shopId },
      data: {
        status: ShopStatus.APPROVED,
        approvedAt: new Date(),
        approvedByAdminId: adminId,
      },
      include: SHOP_INCLUDE,
    }),
    prisma.user.update({
      where: { id: shop.ownerUserId },
      data: { role: UserRole.SHOP },
    }),
  ]);

  await cacheDel('shops:approved:p1:s20');
  return updated;
}

export async function suspendShop(shopId: string): Promise<ShopWithRelations> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw ApiError.notFound('Shop not found');
  if (shop.status === ShopStatus.SUSPENDED) throw ApiError.conflict('Shop is already suspended');

  const updated = await prisma.shop.update({
    where: { id: shopId },
    data: { status: ShopStatus.SUSPENDED },
    include: SHOP_INCLUDE,
  });

  await cacheDel('shops:approved:p1:s20');
  return updated;
}

export async function updateCommissionRate(
  shopId: string,
  commissionRate: number,
): Promise<ShopWithRelations> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw ApiError.notFound('Shop not found');

  return prisma.shop.update({
    where: { id: shopId },
    data: { commissionRate },
    include: SHOP_INCLUDE,
  });
}
