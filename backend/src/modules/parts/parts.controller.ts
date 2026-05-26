import type { Request, Response } from 'express';
import type { Shop } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { uploadFiles } from '../../services/cloudinary.service';
import {
  addPartPhotos,
  createPart,
  getPart,
  listCategories,
  listParts,
  removePartPhoto,
  softDeletePart,
  updatePart,
} from './parts.service';

function user(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

function shopId(res: { locals: Record<string, unknown> }): string {
  return (res.locals.shop as Shop).id;
}

export const categories = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ categories: await listCategories() });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as {
    shopId?: string; categoryId?: string; brandId?: string; search?: string;
    minPrice?: number; maxPrice?: number; includeInactive?: boolean;
    page?: number; pageSize?: number;
  };
  res.json(await listParts(q));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json({ part: await getPart(req.params.id) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const part = await createPart(shopId(res), req.body as Parameters<typeof createPart>[1]);
  res.status(201).json({ part });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const part = await updatePart(req.params.id, shopId(res), req.body as Parameters<typeof updatePart>[2]);
  res.json({ part });
});

export const softDelete = asyncHandler(async (req: Request, res: Response) => {
  await softDeletePart(req.params.id, shopId(res));
  res.json({ ok: true });
});

export const uploadPhotos = asyncHandler(async (req: Request, res: Response) => {
  user(req);
  const files = (req.files ?? []) as Express.Multer.File[];
  if (files.length === 0) throw ApiError.badRequest('No image files provided');

  const urls = await uploadFiles(files, 'parts');
  const part = await addPartPhotos(req.params.id, shopId(res), urls);
  res.json({ part });
});

export const deletePhoto = asyncHandler(async (req: Request, res: Response) => {
  user(req);
  const { photoUrl } = req.body as { photoUrl: string };
  if (!photoUrl) throw ApiError.badRequest('photoUrl is required');
  const part = await removePartPhoto(req.params.id, shopId(res), photoUrl);
  res.json({ part });
});
