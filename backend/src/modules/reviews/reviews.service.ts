import { type ReviewTargetType, type Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/ApiError';

const REVIEW_INCLUDE = {
  author: { select: { id: true, fullName: true } },
} as const;

export type ReviewWithAuthor = Prisma.ReviewGetPayload<{ include: typeof REVIEW_INCLUDE }>;

// ─── Ownership guards ────────────────────────────────────────────────────────

/**
 * Customers can only review appointments they actually had.
 */
async function assertCanReviewAppointment(
  authorId: string,
  appointmentId: string,
): Promise<void> {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (appt.customerId !== authorId) {
    throw ApiError.forbidden('You can only review your own appointments');
  }
  if (appt.status !== 'REPAIRED') {
    throw ApiError.badRequest('You can only review completed (REPAIRED) appointments');
  }
}

/**
 * Customers can only review parts they purchased in a PAID order.
 */
async function assertCanReviewPart(authorId: string, partId: string): Promise<void> {
  const purchase = await prisma.orderItem.findFirst({
    where: {
      partId,
      order: { customerId: authorId, status: 'PAID' },
    },
  });
  if (!purchase) {
    throw ApiError.forbidden('You can only review parts you have purchased');
  }
}

// ─── Service operations ───────────────────────────────────────────────────────

export async function createReview(input: {
  authorId: string;
  targetType: ReviewTargetType;
  appointmentId?: string;
  partId?: string;
  rating: number;
  comment?: string;
}): Promise<ReviewWithAuthor> {
  // XOR validation at API level (DB CHECK constraint is the safety net)
  if (input.targetType === 'APPOINTMENT') {
    if (!input.appointmentId) throw ApiError.badRequest('appointmentId is required');
    if (input.partId) throw ApiError.badRequest('partId must not be set for APPOINTMENT reviews');
    await assertCanReviewAppointment(input.authorId, input.appointmentId);
  } else {
    if (!input.partId) throw ApiError.badRequest('partId is required');
    if (input.appointmentId) throw ApiError.badRequest('appointmentId must not be set for PART reviews');
    await assertCanReviewPart(input.authorId, input.partId);
  }

  try {
    return await prisma.review.create({
      data: {
        authorId: input.authorId,
        targetType: input.targetType,
        appointmentId: input.appointmentId,
        partId: input.partId,
        rating: input.rating,
        comment: input.comment,
      },
      include: REVIEW_INCLUDE,
    });
  } catch (err: unknown) {
    // Prisma P2002 = unique constraint — the XOR unique indexes prevent duplicate reviews
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      throw ApiError.conflict('You have already reviewed this item');
    }
    throw err;
  }
}

export async function updateReview(
  id: string,
  authorId: string,
  input: { rating?: number; comment?: string | null },
  isAdmin: boolean,
): Promise<ReviewWithAuthor> {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw ApiError.notFound('Review not found');
  if (!isAdmin && review.authorId !== authorId) {
    throw ApiError.forbidden('You can only edit your own reviews');
  }

  return prisma.review.update({
    where: { id },
    data: {
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.comment !== undefined ? { comment: input.comment } : {}),
    },
    include: REVIEW_INCLUDE,
  });
}

export async function deleteReview(
  id: string,
  authorId: string,
  isAdmin: boolean,
): Promise<void> {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw ApiError.notFound('Review not found');
  if (!isAdmin && review.authorId !== authorId) {
    throw ApiError.forbidden('You can only delete your own reviews');
  }
  await prisma.review.delete({ where: { id } });
}

export async function getReviewsForAppointment(
  appointmentId: string,
): Promise<ReviewWithAuthor[]> {
  return prisma.review.findMany({
    where: { appointmentId },
    include: REVIEW_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getReviewsForPart(partId: string): Promise<{
  reviews: ReviewWithAuthor[];
  averageRating: number | null;
  count: number;
}> {
  const [reviews, stats] = await Promise.all([
    prisma.review.findMany({
      where: { partId },
      include: REVIEW_INCLUDE,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.aggregate({
      where: { partId },
      _avg: { rating: true },
      _count: { id: true },
    }),
  ]);

  return {
    reviews,
    averageRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : null,
    count: stats._count.id,
  };
}
