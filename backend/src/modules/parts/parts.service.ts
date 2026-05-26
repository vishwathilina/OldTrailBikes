import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { cacheGet, cacheSet, cacheDel } from '../../services/redis-cache.service';
import { deleteImages } from '../../services/cloudinary.service';

const PART_INCLUDE = {
  shop: { select: { id: true, name: true, slug: true } },
  brand: true,
  category: true,
} as const;

export type PartWithRelations = Prisma.SparePartGetPayload<{ include: typeof PART_INCLUDE }>;

const CAT_CACHE_KEY = 'parts:categories';
const CAT_TTL = 86400; // 24 h — categories rarely change

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listCategories() {
  const cached = await cacheGet<Awaited<ReturnType<typeof prisma.partCategory.findMany>>>(CAT_CACHE_KEY);
  if (cached) return cached;

  const cats = await prisma.partCategory.findMany({ orderBy: { name: 'asc' } });
  await cacheSet(CAT_CACHE_KEY, cats, CAT_TTL);
  return cats;
}

// ─── Parts CRUD ───────────────────────────────────────────────────────────────

export async function createPart(shopId: string, input: {
  categoryId: string;
  brandId?: string;
  name: string;
  description?: string;
  compatibleBikes?: string[];
  price: number;
  stockQuantity: number;
}): Promise<PartWithRelations> {
  const [category, brand] = await Promise.all([
    prisma.partCategory.findUnique({ where: { id: input.categoryId } }),
    input.brandId ? prisma.brand.findUnique({ where: { id: input.brandId } }) : Promise.resolve(null),
  ]);
  if (!category) throw ApiError.notFound('Part category not found');
  if (input.brandId && !brand) throw ApiError.notFound('Brand not found');

  return prisma.sparePart.create({
    data: {
      shopId,
      categoryId: input.categoryId,
      brandId: input.brandId,
      name: input.name,
      description: input.description,
      compatibleBikes: input.compatibleBikes ?? [],
      price: input.price,
      stockQuantity: input.stockQuantity,
    },
    include: PART_INCLUDE,
  });
}

export async function getPart(id: string): Promise<PartWithRelations> {
  const part = await prisma.sparePart.findUnique({ where: { id }, include: PART_INCLUDE });
  if (!part || !part.isActive) throw ApiError.notFound('Part not found');
  return part;
}

export async function listParts(params: {
  shopId?: string;
  categoryId?: string;
  brandId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ items: PartWithRelations[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 24;

  const where: Prisma.SparePartWhereInput = {
    isActive: params.includeInactive ? undefined : true,
    ...(params.shopId ? { shopId: params.shopId } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.brandId ? { brandId: params.brandId } : {}),
    ...(params.search
      ? { name: { contains: params.search, mode: 'insensitive' as const } }
      : {}),
    ...(params.minPrice !== undefined || params.maxPrice !== undefined
      ? {
          price: {
            ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
            ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
          },
        }
      : {}),
    // Only parts from approved shops shown publicly
    shop: { status: 'APPROVED' },
  };

  const [items, total] = await Promise.all([
    prisma.sparePart.findMany({
      where,
      include: PART_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sparePart.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function updatePart(
  id: string,
  shopId: string,
  input: {
    categoryId?: string;
    brandId?: string | null;
    name?: string;
    description?: string | null;
    compatibleBikes?: string[];
    price?: number;
    stockQuantity?: number;
  },
): Promise<PartWithRelations> {
  const part = await prisma.sparePart.findUnique({ where: { id } });
  if (!part || !part.isActive) throw ApiError.notFound('Part not found');
  if (part.shopId !== shopId) throw ApiError.forbidden('This part does not belong to your shop');

  if (input.categoryId) {
    const cat = await prisma.partCategory.findUnique({ where: { id: input.categoryId } });
    if (!cat) throw ApiError.notFound('Category not found');
  }

  return prisma.sparePart.update({
    where: { id },
    data: {
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.compatibleBikes !== undefined ? { compatibleBikes: input.compatibleBikes } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.stockQuantity !== undefined ? { stockQuantity: input.stockQuantity } : {}),
    },
    include: PART_INCLUDE,
  });
}

/** Soft-delete: sets isActive = false, preserving historical order references. */
export async function softDeletePart(id: string, shopId: string): Promise<void> {
  const part = await prisma.sparePart.findUnique({ where: { id } });
  if (!part) throw ApiError.notFound('Part not found');
  if (part.shopId !== shopId) throw ApiError.forbidden('This part does not belong to your shop');
  if (!part.isActive) throw ApiError.conflict('Part is already deactivated');

  await prisma.sparePart.update({ where: { id }, data: { isActive: false } });
}

export async function addPartPhotos(
  id: string,
  shopId: string,
  urls: string[],
): Promise<PartWithRelations> {
  const part = await prisma.sparePart.findUnique({ where: { id } });
  if (!part || !part.isActive) throw ApiError.notFound('Part not found');
  if (part.shopId !== shopId) throw ApiError.forbidden('This part does not belong to your shop');

  return prisma.sparePart.update({
    where: { id },
    data: { photos: { push: urls } },
    include: PART_INCLUDE,
  });
}

export async function removePartPhoto(
  id: string,
  shopId: string,
  photoUrl: string,
): Promise<PartWithRelations> {
  const part = await prisma.sparePart.findUnique({ where: { id } });
  if (!part || !part.isActive) throw ApiError.notFound('Part not found');
  if (part.shopId !== shopId) throw ApiError.forbidden('This part does not belong to your shop');
  if (!part.photos.includes(photoUrl)) throw ApiError.notFound('Photo not found on this part');

  const updated = await prisma.sparePart.update({
    where: { id },
    data: { photos: part.photos.filter((p) => p !== photoUrl) },
    include: PART_INCLUDE,
  });

  void deleteImages([photoUrl]);
  return updated;
}

export async function invalidateCategoriesCache(): Promise<void> {
  await cacheDel(CAT_CACHE_KEY);
}
