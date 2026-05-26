import type { Request, Response } from 'express';
import type { OrderStatus, Shop } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { prisma } from '../../config/db';
import {
  createOrder,
  getOrder,
  listAllOrders,
  listMyOrders,
  listShopSales,
} from './orders.service';

function user(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);

  const customer = await prisma.user.findUnique({ where: { id: u.sub } });
  if (!customer) throw ApiError.unauthorized();

  const { items, shippingAddress } = req.body as {
    items: { partId: string; quantity: number }[];
    shippingAddress?: Record<string, string> | null;
  };

  const result = await createOrder(
    { customerId: u.sub, items, shippingAddress },
    customer.fullName,
    customer.email,
    customer.phone ?? '',
  );

  res.status(201).json(result);
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  const { status, page, pageSize } = req.query as { status?: OrderStatus; page?: number; pageSize?: number };
  res.json(await listMyOrders(u.sub, { status, page, pageSize }));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  const order = await getOrder(req.params.id, {
    customerId: u.sub,
    isAdmin: u.role === 'ADMIN',
  });
  res.json({ order });
});

export const shopSales = asyncHandler(async (req: Request, res: Response) => {
  const shop = res.locals.shop as Shop;
  const { page, pageSize } = req.query as { page?: number; pageSize?: number };
  res.json(await listShopSales(shop.id, { page, pageSize }));
});

export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const { status, page, pageSize } = req.query as { status?: OrderStatus; page?: number; pageSize?: number };
  res.json(await listAllOrders({ status, page, pageSize }));
});
