import type { Request, Response } from 'express';
import type { EngineType, ListingStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { uploadFiles } from '../../services/cloudinary.service';
import {
  addPhotos,
  createListing,
  deleteListing,
  getListing,
  listListings,
  removePhoto,
  removeVerification,
  updateListing,
  updateListingStatus,
  verifyBike,
} from './bikes.service';

function user(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  const listing = await createListing({ ...req.body as Parameters<typeof createListing>[0], sellerId: u.sub });
  res.status(201).json({ listing });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as {
    brandId?: string; engineType?: EngineType; status?: ListingStatus;
    verified?: boolean; minPrice?: number; maxPrice?: number;
    sellerId?: string; page?: number; pageSize?: number;
  };
  const result = await listListings({ ...q, isAdmin: req.user?.role === 'ADMIN' });
  res.json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const listing = await getListing(req.params.id, {
    sellerId: req.user?.sub,
    isAdmin: req.user?.role === 'ADMIN',
  });
  res.json({ listing });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  const listing = await updateListing(req.params.id, u.sub, req.body as Parameters<typeof updateListing>[2], u.role === 'ADMIN');
  res.json({ listing });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  const { status } = req.body as { status: ListingStatus };
  const listing = await updateListingStatus(req.params.id, u.sub, status);
  res.json({ listing });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  await deleteListing(req.params.id, u.sub, u.role === 'ADMIN');
  res.json({ ok: true });
});

export const uploadPhotos = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  const files = (req.files ?? []) as Express.Multer.File[];
  if (files.length === 0) throw ApiError.badRequest('No image files provided');

  const urls = await uploadFiles(files, 'bikes');
  const listing = await addPhotos(req.params.id, u.sub, urls);
  res.json({ listing });
});

export const deletePhoto = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  const { photoUrl } = req.body as { photoUrl: string };
  if (!photoUrl) throw ApiError.badRequest('photoUrl is required');
  const listing = await removePhoto(req.params.id, u.sub, photoUrl);
  res.json({ listing });
});

export const verify = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  const { inspectionNotes } = req.body as { inspectionNotes: string };
  const listing = await verifyBike(req.params.id, u.sub, inspectionNotes);
  res.json({ listing });
});

export const unverify = asyncHandler(async (req: Request, res: Response) => {
  const listing = await removeVerification(req.params.id);
  res.json({ listing });
});
