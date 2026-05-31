'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ShieldCheck,
  SlidersHorizontal, ChevronLeft, ChevronRight, Plus, Search, Bike,
} from 'lucide-react';
import { bikes as bikesApi, brands as brandsApi } from '@/lib/api';
import type { BikeForSale, Brand } from '@/lib/types';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';
import type { MessageKey } from '@/lib/messages';
import { buildMarketplaceSlug } from '@/lib/marketplace-slug';

const ENGINE_VALUES = ['TWO_STROKE', 'FOUR_STROKE', 'ELECTRIC'] as const;
const PAGE_SIZE = 12;

// ─── Bike Card ────────────────────────────────────────────────────────────────
function BikeCard({ bike }: { bike: BikeForSale }) {
  const { t, locale } = useLanguage();
  const label = `${bike.brand?.name ?? ''} ${bike.model}`.trim();
  const seoPath = `/marketplace/${buildMarketplaceSlug(bike)}`;
  const metaLine = `${bike.year} · ${
    bike.engineType === 'TWO_STROKE'
      ? t('marketplace.engine.2t')
      : bike.engineType === 'FOUR_STROKE'
        ? t('marketplace.engine.4t')
        : t('engine.ELECTRIC')
  } · ${bike.mileageKm.toLocaleString(locale)} ${t('common.km')}`;

  return (
    <Link
      href={seoPath}
      aria-label={`${label}, ${t('common.lkr')} ${Number(bike.price).toLocaleString(locale)}`}
      className={cn(
        'group relative flex flex-row items-stretch overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-sm transition-all',
        'hover:border-neutral-300 hover:shadow-md',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e51b23]',
        'active:scale-[0.99] touch-manipulation sm:flex-col',
      )}
    >
      {/* Photo — exactly half width on mobile (height follows row, not image aspect); full-width banner on sm+ */}
      <div className="relative w-1/2 shrink-0 self-stretch overflow-hidden bg-neutral-50 sm:w-full sm:max-w-none">
        <div className="relative h-full min-h-[10rem] w-full sm:min-h-0 sm:aspect-[4/3]">
          {bike.photos[0] ? (
            <img
              src={bike.photos[0]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:relative sm:inset-auto sm:block sm:h-full sm:w-full"
            />
          ) : (
            <div className="flex h-full min-h-[10rem] w-full items-center justify-center sm:min-h-0 sm:aspect-[4/3]">
              <Bike className="h-10 w-10 text-otb-text/10 sm:h-14 sm:w-14" />
            </div>
          )}
          {bike.isMechanicVerified && (
            <div className="pointer-events-none absolute left-1.5 top-1.5 flex max-w-[calc(100%-0.75rem)] items-center gap-1 rounded-md bg-emerald-700/95 px-1.5 py-1 shadow-sm sm:left-2 sm:top-2 sm:gap-1.5 sm:px-2.5 sm:py-1.5">
              <ShieldCheck className="h-3 w-3 shrink-0 text-white sm:h-3.5 sm:w-3.5" />
              <span className="truncate font-sans text-[10px] font-semibold text-white sm:text-xs">{t('marketplace.verified')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Details — half width on mobile */}
      <div className="flex w-1/2 min-w-0 flex-col justify-between gap-2.5 p-3.5 sm:w-full sm:flex-1 sm:gap-0 sm:p-5">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-otb-text sm:line-clamp-none sm:truncate sm:text-xl md:text-2xl">
            {bike.brand?.name} {bike.model}
          </h3>
          <p className="mt-1.5 line-clamp-1 text-xs leading-snug text-otb-text/75 sm:mt-1 sm:line-clamp-none sm:text-base sm:text-otb-text/85">
            {metaLine}
          </p>

          <div className="mt-2 flex items-start gap-1.5 text-xs text-otb-text/70 sm:mt-3 sm:text-base sm:text-otb-text">
            <svg className="mt-0.5 h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="min-w-0 leading-snug break-words line-clamp-2 sm:line-clamp-none">{bike.location}</span>
          </div>
        </div>

        <p className="mt-1.5 font-sans text-base font-semibold tabular-nums text-otb-text sm:mt-2 sm:text-lg md:text-xl">
          {t('common.lkr')} {Number(bike.price).toLocaleString(locale)}
        </p>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-row items-stretch overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-sm sm:flex-col">
      <div className="min-h-[10rem] w-1/2 shrink-0 self-stretch animate-pulse bg-neutral-100 sm:aspect-[4/3] sm:min-h-0 sm:w-full" />
      <div className="flex w-1/2 min-w-0 flex-col justify-between gap-2.5 p-3.5 sm:w-full sm:flex-1 sm:p-5">
        <div className="space-y-2.5">
          <div className="h-5 w-full animate-pulse rounded bg-neutral-100 sm:h-7 sm:w-4/5" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-neutral-100 sm:h-5 sm:w-1/2" />
          <div className="h-3.5 w-full animate-pulse rounded bg-neutral-100 sm:h-5 sm:w-2/3" />
        </div>
        <div className="h-5 w-32 animate-pulse rounded bg-neutral-100 sm:h-6 sm:w-36" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function MarketplaceInner() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<BikeForSale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [brandId,      setBrandId]      = useState(searchParams.get('brandId') ?? '');
  const [engineType,   setEngineType]   = useState(searchParams.get('engineType') ?? '');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const r = await bikesApi.list({ brandId: brandId || undefined, engineType: engineType || undefined, verified: verifiedOnly || undefined, page, pageSize: PAGE_SIZE });
      setListings(r.items);
      setTotal(r.total);
    } catch { toast.error(t('marketplace.toast.loadError')); setListings([]); }
    finally { setLoading(false); }
  }, [brandId, engineType, verifiedOnly, page, t]);

  useEffect(() => { void fetchListings(); }, [fetchListings]);
  useEffect(() => { brandsApi.list().then(r => setAllBrands(r.brands)).catch(() => {}); }, []);

  const clearFilters = () => { setBrandId(''); setEngineType(''); setVerifiedOnly(false); setPage(1); };
  const hasFilters = brandId || engineType || verifiedOnly;

  const FilterPanel = () => (
    <div className="space-y-5">
      {/* Brand */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-otb-text">{t('marketplace.filter.brand')}</label>
        <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
          <button onClick={() => { setBrandId(''); setPage(1); }}
            className={cn('text-left px-3 py-2.5 text-sm font-semibold transition-colors', !brandId ? 'bg-otb-text text-white' : 'text-otb-text hover:bg-otb-text/5')}>
            {t('marketplace.filter.allBrands')}
          </button>
          {allBrands.map(b => (
            <button key={b.id} onClick={() => { setBrandId(b.id); setPage(1); }}
              className={cn('text-left px-3 py-2.5 text-sm font-semibold transition-colors', brandId === b.id ? 'bg-otb-text text-white' : 'text-otb-text hover:bg-otb-text/5')}>
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Engine */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-otb-text">{t('marketplace.filter.engine')}</label>
        <div className="flex flex-col gap-0.5">
          <button onClick={() => { setEngineType(''); setPage(1); }}
            className={cn('text-left px-3 py-2.5 text-sm font-semibold transition-colors', !engineType ? 'bg-otb-text text-white' : 'text-otb-text hover:bg-otb-text/5')}>
            {t('marketplace.filter.allEngines')}
          </button>
          {ENGINE_VALUES.map((value) => (
            <button key={value} onClick={() => { setEngineType(value); setPage(1); }}
              className={cn('text-left px-3 py-2.5 text-sm font-semibold transition-colors', engineType === value ? 'bg-otb-text text-white' : 'text-otb-text hover:bg-otb-text/5')}>
              {t(`engine.${value}` as MessageKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Verified */}
      <button type="button" onClick={() => { setVerifiedOnly(v => !v); setPage(1); }}
        className={cn('flex w-full items-center gap-2.5 rounded-md border px-3 py-3 text-sm font-semibold transition-colors',
          verifiedOnly ? 'border-emerald-600/40 bg-emerald-50 text-emerald-900' : 'border-neutral-200 text-otb-text hover:border-neutral-300')}>
        <ShieldCheck className="h-5 w-5 shrink-0" />
        {t('marketplace.filter.verified')}
      </button>
    </div>
  );

  const visibleListings = listings.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return b.brand?.name.toLowerCase().includes(s) || b.model.toLowerCase().includes(s) || b.location.toLowerCase().includes(s);
  });

  return (
    <div className="min-h-screen bg-white">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200/80 bg-white">
        <div className="section-container relative overflow-hidden py-7 md:py-10">
          <span aria-hidden className="absolute -right-2 top-0 hidden select-none text-[120px] font-bold leading-none text-neutral-200/90 md:block">
            {t('marketplace.ghostTitle')}
          </span>
          <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="h-px w-8 bg-neutral-300" />
                <span className="text-sm font-medium text-otb-text">{t('marketplace.eyebrow')}</span>
              </div>
              <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-otb-text sm:text-5xl md:text-6xl">
                {t('marketplace.title')}
              </h1>
            </div>
            {isAuthenticated && (
              <Link href="/marketplace/sell"
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-md bg-[#e51b23] px-6 py-3.5 font-sans text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#c9161e] sm:self-auto">
                <Plus className="h-5 w-5" /> {t('marketplace.sell')}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="section-container py-7 md:py-10">
        {/* Search bar */}
        <div className="relative mb-7">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-otb-text/50" />
          <input
            placeholder={t('marketplace.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-4 pl-12 pr-4 text-base text-otb-text shadow-sm placeholder:text-neutral-500 transition-shadow focus:border-[#e51b23]/50 focus:outline-none focus:ring-2 focus:ring-[#e51b23]/20"
          />
        </div>

        {/* Mobile filter toggle */}
        <div className="mb-5 flex items-center justify-between lg:hidden">
          <p className="text-base font-medium text-otb-text">{loading ? '' : `${total} ${total === 1 ? t('marketplace.listing') : t('marketplace.listings')}`}</p>
          <button onClick={() => setFiltersOpen(v => !v)}
            className={cn('flex items-center gap-2 border px-4 py-2.5 text-sm font-bold transition-colors',
              hasFilters ? 'border-otb-text text-otb-text' : 'border-neutral-300 text-otb-text hover:border-neutral-400')}>
            <SlidersHorizontal className="h-4 w-4" />
            {t('marketplace.filters.toggle')}{hasFilters && ` (${t('common.filtersOn')})`}
          </button>
        </div>

        {/* Mobile filters panel */}
        {filtersOpen && (
          <div className="mb-7 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm lg:hidden">
            <div className="mb-5 flex items-center justify-between gap-2 border-b border-neutral-100 pb-4">
              <p className="text-base font-bold text-otb-text">{t('marketplace.filters.heading')}</p>
              {hasFilters && (
                <button type="button" onClick={clearFilters}
                  className="text-sm font-semibold text-otb-text underline-offset-2 hover:underline">
                  {t('marketplace.filters.clearAll')}
                </button>
              )}
            </div>
            <FilterPanel />
          </div>
        )}

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-20 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-2 border-b border-neutral-100 pb-4">
                <p className="text-base font-bold text-otb-text">{t('marketplace.filters.heading')}</p>
                {hasFilters && (
                  <button type="button" onClick={clearFilters}
                    className="text-sm font-semibold text-otb-text underline-offset-2 hover:underline">
                    {t('marketplace.filters.clearAll')}
                  </button>
                )}
              </div>
              <FilterPanel />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <p className="mb-5 hidden text-base font-medium text-otb-text lg:block">
              {loading ? '' : `${total} ${total === 1 ? t('marketplace.listing') : t('marketplace.listings')}`}
            </p>

            {loading ? (
              <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                {Array.from({length: 6}).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : visibleListings.length === 0 ? (
              <div className="flex flex-col items-center rounded-lg border border-neutral-200 bg-neutral-50/50 py-20 text-center">
                <Bike className="mb-4 h-12 w-12 text-neutral-400" />
                <p className="max-w-md text-base leading-relaxed text-otb-text">{t('marketplace.empty')}</p>
                {hasFilters && (
                  <button type="button" onClick={clearFilters}
                    className="mt-5 text-base font-semibold text-[#e51b23] underline-offset-4 hover:underline">
                    {t('marketplace.filters.clearAll')}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                  {visibleListings.map(bike => <BikeCard key={bike.id} bike={bike} />)}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                    <button type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="flex items-center gap-2 rounded-md border border-neutral-200 px-5 py-3 font-sans text-sm font-semibold text-otb-text transition-colors hover:border-neutral-300 disabled:opacity-30">
                      <ChevronLeft className="h-5 w-5" /> {t('common.prev')}
                    </button>
                    <span className="rounded-md border border-neutral-200 bg-white px-5 py-3 font-sans text-sm font-semibold text-otb-text">
                      {t('common.pageOf', { current: page, total: totalPages })}
                    </span>
                    <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                      className="flex items-center gap-2 rounded-md border border-neutral-200 px-5 py-3 font-sans text-sm font-semibold text-otb-text transition-colors hover:border-neutral-300 disabled:opacity-30">
                      {t('common.nextPage')} <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#e51b23] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MarketplaceInner />
    </Suspense>
  );
}
