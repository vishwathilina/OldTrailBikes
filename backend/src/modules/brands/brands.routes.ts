import { Router } from 'express';
import type { Brand } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../config/db';
import { cacheGet, cacheSet } from '../../services/redis-cache.service';
import { authenticate, authorize } from '../../middleware/auth';
import { notImplemented } from '../_stub';

export const brandsRouter = Router();

const BRANDS_CACHE_KEY = 'brands:list';
const BRANDS_TTL = 86400; // 24 h

// Public — Redis-cached
brandsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const cached = await cacheGet<Brand[]>(BRANDS_CACHE_KEY);
    if (cached) return res.json({ brands: cached });

    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
    await cacheSet(BRANDS_CACHE_KEY, brands, BRANDS_TTL);
    res.json({ brands });
  }),
);

// Admin-only mutations
brandsRouter.post('/', authenticate, authorize('ADMIN'), notImplemented('POST /brands'));
brandsRouter.patch('/:id', authenticate, authorize('ADMIN'), notImplemented('PATCH /brands/:id'));
brandsRouter.delete('/:id', authenticate, authorize('ADMIN'), notImplemented('DELETE /brands/:id'));
