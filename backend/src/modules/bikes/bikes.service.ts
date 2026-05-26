import { ListingStatus, type EngineType, type Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { cacheGet, cacheSet, cacheDel } from '../../services/redis-cache.service';
import { deleteImages } from '../../services/cloudinary.service';

// ─── Prisma include shape ─────────────────────────────────────────────────────

const BIKE_INCLUDE = {
  seller: { select: { id: true, fullName: true, phone: true } },
  brand: true,
  verification: {
    include: { admin: { select: { id: true, fullName: true } } },
  },
} as const;

export type BikeWithRelations = Prisma.BikeForSaleGetPayload<{ include: typeof BIKE_INCLUDE }>;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateListingInput {
  sellerId: string;
  brandId: string;
  model: string;
  year: number;
  engineType: EngineType;
  mileageKm: number;
  fuelConsumption?: number;
  price: number;
  description: string;
  location: string;
  whatsappNumber?: string;
  phoneNumber?: string;
}

export interface UpdateListingInput {
  brandId?: string;
  model?: string;
  year?: number;
  engineType?: EngineType;
  mileageKm?: number;
  fuelConsumption?: number | null;
  price?: number;
  description?: string;
  location?: string;
  whatsappNumber?: string | null;
  phoneNumber?: string | null;
}

export interface ListListingsParams {
  brandId?: string;
  engineType?: EngineType;
  status?: ListingStatus;
  verified?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sellerId?: string;
  page?: number;
  pageSize?: number;
  isAdmin?: boolean;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

const LISTING_TTL = 300; // 5 min

async function evictListingCache(id: string): Promise<void> {
  await cacheDel(`bike:${id}`, 'bikes:public:page:1');
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function createListing(input: CreateListingInput): Promise<BikeWithRelations> {
  const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
  if (!brand) throw ApiError.notFound('Brand not found');

  const listing = await prisma.bikeForSale.create({
    data: {
      sellerId: input.sellerId,
      brandId: input.brandId,
      model: input.model,
      year: input.year,
      engineType: input.engineType,
      mileageKm: input.mileageKm,
      fuelConsumption: input.fuelConsumption,
      price: input.price,
      description: input.description,
      location: input.location,
      whatsappNumber: input.whatsappNumber,
      phoneNumber: input.phoneNumber,
      status: ListingStatus.AVAILABLE,
    },
    include: BIKE_INCLUDE,
  });

  await cacheDel('bikes:public:page:1');
  return listing;
}

export async function getListing(
  id: string,
  opts: { sellerId?: string; isAdmin?: boolean } = {},
): Promise<BikeWithRelations> {
  const cached = await cacheGet<BikeWithRelations>(`bike:${id}`);
  if (cached) return cached;

  const listing = await prisma.bikeForSale.findUnique({ where: { id }, include: BIKE_INCLUDE });
  if (!listing) throw ApiError.notFound('Listing not found');

  // Non-admin, non-owner can only see AVAILABLE listings
  if (!opts.isAdmin && listing.sellerId !== opts.sellerId) {
    if (listing.status !== ListingStatus.AVAILABLE) {
      throw ApiError.notFound('Listing not found');
    }
  }

  await cacheSet(`bike:${id}`, listing, LISTING_TTL);
  return listing;
}

export async function listListings(params: ListListingsParams): Promise<{
  items: BikeWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const where: Prisma.BikeForSaleWhereInput = {
    ...(params.brandId ? { brandId: params.brandId } : {}),
    ...(params.engineType ? { engineType: params.engineType } : {}),
    ...(params.sellerId ? { sellerId: params.sellerId } : {}),
    ...(params.verified !== undefined ? { isMechanicVerified: params.verified } : {}),
    ...(params.minPrice !== undefined || params.maxPrice !== undefined
      ? {
          price: {
            ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
            ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
          },
        }
      : {}),
    // Public view: only AVAILABLE; admin / seller queries can filter by status explicitly
    ...(params.isAdmin || params.sellerId
      ? params.status
        ? { status: params.status }
        : {}
      : { status: params.status ?? ListingStatus.AVAILABLE }),
  };

  const [items, total] = await Promise.all([
    prisma.bikeForSale.findMany({
      where,
      include: BIKE_INCLUDE,
      orderBy: [{ isMechanicVerified: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bikeForSale.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function updateListing(
  id: string,
  sellerId: string,
  input: UpdateListingInput,
  isAdmin = false,
): Promise<BikeWithRelations> {
  const listing = await prisma.bikeForSale.findUnique({ where: { id } });
  if (!listing) throw ApiError.notFound('Listing not found');
  if (!isAdmin && listing.sellerId !== sellerId) throw ApiError.forbidden('Not your listing');

  const updated = await prisma.bikeForSale.update({
    where: { id },
    data: {
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.model !== undefined ? { model: input.model } : {}),
      ...(input.year !== undefined ? { year: input.year } : {}),
      ...(input.engineType !== undefined ? { engineType: input.engineType } : {}),
      ...(input.mileageKm !== undefined ? { mileageKm: input.mileageKm } : {}),
      ...(input.fuelConsumption !== undefined ? { fuelConsumption: input.fuelConsumption } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.whatsappNumber !== undefined ? { whatsappNumber: input.whatsappNumber } : {}),
      ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber } : {}),
    },
    include: BIKE_INCLUDE,
  });

  await evictListingCache(id);
  return updated;
}

export async function updateListingStatus(
  id: string,
  sellerId: string,
  status: ListingStatus,
): Promise<BikeWithRelations> {
  const listing = await prisma.bikeForSale.findUnique({ where: { id } });
  if (!listing) throw ApiError.notFound('Listing not found');
  if (listing.sellerId !== sellerId) throw ApiError.forbidden('Not your listing');

  const updated = await prisma.bikeForSale.update({
    where: { id },
    data: { status },
    include: BIKE_INCLUDE,
  });

  await evictListingCache(id);
  return updated;
}

export async function deleteListing(
  id: string,
  sellerId: string,
  isAdmin = false,
): Promise<void> {
  const listing = await prisma.bikeForSale.findUnique({ where: { id } });
  if (!listing) throw ApiError.notFound('Listing not found');
  if (!isAdmin && listing.sellerId !== sellerId) throw ApiError.forbidden('Not your listing');

  await prisma.bikeForSale.delete({ where: { id } });
  await evictListingCache(id);
  void deleteImages(listing.photos);
}

export async function addPhotos(
  id: string,
  sellerId: string,
  urls: string[],
): Promise<BikeWithRelations> {
  const listing = await prisma.bikeForSale.findUnique({ where: { id } });
  if (!listing) throw ApiError.notFound('Listing not found');
  if (listing.sellerId !== sellerId) throw ApiError.forbidden('Not your listing');

  const updated = await prisma.bikeForSale.update({
    where: { id },
    data: { photos: { push: urls } },
    include: BIKE_INCLUDE,
  });

  await evictListingCache(id);
  return updated;
}

export async function removePhoto(
  id: string,
  sellerId: string,
  photoUrl: string,
): Promise<BikeWithRelations> {
  const listing = await prisma.bikeForSale.findUnique({ where: { id } });
  if (!listing) throw ApiError.notFound('Listing not found');
  if (listing.sellerId !== sellerId) throw ApiError.forbidden('Not your listing');
  if (!listing.photos.includes(photoUrl)) throw ApiError.notFound('Photo not found on this listing');

  const updated = await prisma.bikeForSale.update({
    where: { id },
    data: { photos: listing.photos.filter((p) => p !== photoUrl) },
    include: BIKE_INCLUDE,
  });

  await evictListingCache(id);
  void deleteImages([photoUrl]);
  return updated;
}

// ─── Mechanic Verification ────────────────────────────────────────────────────

/**
 * Insert a mechanic_verifications record. The set_mechanic_verified
 * PostgreSQL trigger automatically flips bikes_for_sale.is_mechanic_verified
 * to TRUE upon insert.
 */
export async function verifyBike(
  listingId: string,
  adminId: string,
  inspectionNotes: string,
): Promise<BikeWithRelations> {
  const listing = await prisma.bikeForSale.findUnique({ where: { id: listingId } });
  if (!listing) throw ApiError.notFound('Listing not found');
  if (listing.isMechanicVerified) {
    throw ApiError.conflict('This listing is already verified', { listingId });
  }

  await prisma.mechanicVerification.create({
    data: { listingId, verifiedByAdmin: adminId, inspectionNotes },
  });

  // Re-fetch so the trigger-updated isMechanicVerified flag is visible
  const updated = await prisma.bikeForSale.findUnique({ where: { id: listingId }, include: BIKE_INCLUDE });
  await evictListingCache(listingId);
  return updated!;
}

/**
 * Delete the verification record. The clear_mechanic_verified trigger
 * sets is_mechanic_verified back to FALSE.
 */
export async function removeVerification(listingId: string): Promise<BikeWithRelations> {
  const listing = await prisma.bikeForSale.findUnique({ where: { id: listingId } });
  if (!listing) throw ApiError.notFound('Listing not found');
  if (!listing.isMechanicVerified) {
    throw ApiError.badRequest('Listing has no mechanic verification to remove');
  }

  await prisma.mechanicVerification.delete({ where: { listingId } });

  const updated = await prisma.bikeForSale.findUnique({ where: { id: listingId }, include: BIKE_INCLUDE });
  await evictListingCache(listingId);
  return updated!;
}
