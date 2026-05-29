import type { BikeForSale } from './types';

export function slugifySegment(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildMarketplaceSlug(bike: Pick<BikeForSale, 'brand' | 'model' | 'location'>): string {
  const parts = [bike.brand?.name, bike.model, 'for sale', bike.location]
    .map((x) => slugifySegment(x ?? ''))
    .filter(Boolean);
  return parts.join('-');
}

