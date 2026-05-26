import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import {
  approveShop,
  applyForShop,
  getMyShop,
  getShopBySlug,
  getShopDashboard,
  listApprovedShops,
  listPendingShops,
  suspendShop,
  updateCommissionRate,
  updateMyShop,
} from './shops.service';

function user(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize } = req.query as { page?: number; pageSize?: number };
  res.json(await listApprovedShops({ page, pageSize }));
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  res.json({ shop: await getShopBySlug(req.params.slug) });
});

export const apply = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  const shop = await applyForShop(u.sub, req.body as Parameters<typeof applyForShop>[1]);
  res.status(201).json({ shop });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json({ shop: await getMyShop(user(req).sub) });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const shop = await updateMyShop(user(req).sub, req.body as Parameters<typeof updateMyShop>[1]);
  res.json({ shop });
});

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  res.json(await getShopDashboard(user(req).sub));
});

export const listPending = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ shops: await listPendingShops() });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  res.json({ shop: await approveShop(req.params.id, u.sub) });
});

export const suspend = asyncHandler(async (req: Request, res: Response) => {
  res.json({ shop: await suspendShop(req.params.id) });
});

export const updateCommission = asyncHandler(async (req: Request, res: Response) => {
  const { commissionRate } = req.body as { commissionRate: number };
  res.json({ shop: await updateCommissionRate(req.params.id, commissionRate) });
});
