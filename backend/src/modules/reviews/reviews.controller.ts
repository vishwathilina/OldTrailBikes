import type { Request, Response } from 'express';
import type { ReviewTargetType } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import {
  createReview,
  deleteReview,
  getReviewsForAppointment,
  getReviewsForPart,
  updateReview,
} from './reviews.service';

function user(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  const { targetType, appointmentId, partId, rating, comment } = req.body as {
    targetType: ReviewTargetType;
    appointmentId?: string;
    partId?: string;
    rating: number;
    comment?: string;
  };
  const review = await createReview({ authorId: u.sub, targetType, appointmentId, partId, rating, comment });
  res.status(201).json({ review });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  const review = await updateReview(
    req.params.id,
    u.sub,
    req.body as { rating?: number; comment?: string | null },
    u.role === 'ADMIN',
  );
  res.json({ review });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const u = user(req);
  await deleteReview(req.params.id, u.sub, u.role === 'ADMIN');
  res.json({ ok: true });
});

export const forAppointment = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await getReviewsForAppointment(req.params.appointmentId);
  res.json({ reviews });
});

export const forPart = asyncHandler(async (req: Request, res: Response) => {
  res.json(await getReviewsForPart(req.params.partId));
});
