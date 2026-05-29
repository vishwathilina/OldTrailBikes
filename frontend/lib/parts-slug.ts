import type { SparePart } from './types';
import { slugifySegment } from './marketplace-slug';

/** SEO path segment e.g. `enzo-drc-tool-bike24-for-sale` from name + shop + suffix */
export function buildPartSlug(part: Pick<SparePart, 'name' | 'shop'>): string {
  const parts = [part.name, part.shop?.name, 'for sale']
    .map((x) => slugifySegment(x ?? ''))
    .filter(Boolean);
  return parts.join('-');
}
