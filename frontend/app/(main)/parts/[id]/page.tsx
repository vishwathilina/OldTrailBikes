'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Package, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { parts as partsApi, ApiClientError } from '@/lib/api';
import type { SparePart } from '@/lib/types';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useCart } from '@/components/providers/CartProvider';
import { cn } from '@/lib/utils';
import { buildPartSlug } from '@/lib/parts-slug';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LIST_PAGE_SIZE = 48;

export default function PartDetailPage() {
  const params = useParams();
  const slugOrId =
    typeof params.id === 'string' ? decodeURIComponent(params.id).trim() : '';
  const { t, locale } = useLanguage();
  const { addItem } = useCart();

  const [part, setPart] = useState<SparePart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'notfound' | 'other' | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);

  const loadPart = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!slugOrId) {
      setError('notfound');
      setLoading(false);
      return;
    }

    try {
      if (UUID_RE.test(slugOrId)) {
        const r = await partsApi.byId(slugOrId);
        setPart(r.part);
        setActivePhoto(0);
        return;
      }

      const target = slugOrId.toLowerCase();
      let page = 1;
      let total = 0;
      let found: SparePart | null = null;

      do {
        const res = await partsApi.list({ page, pageSize: LIST_PAGE_SIZE });
        total = res.total;
        found =
          res.items.find((p) => buildPartSlug(p).toLowerCase() === target) ?? null;
        if (found) break;
        page += 1;
      } while ((page - 1) * LIST_PAGE_SIZE < total);

      if (!found) {
        setError('notfound');
        return;
      }

      setPart(found);
      setActivePhoto(0);
    } catch (e) {
      if (e instanceof ApiClientError && (e.status === 404 || e.status === 400)) {
        setError('notfound');
      } else {
        setError('other');
      }
    } finally {
      setLoading(false);
    }
  }, [slugOrId]);

  useEffect(() => {
    void loadPart();
  }, [loadPart]);

  const photos = part?.photos?.length ? part.photos : [];
  const showArrows = photos.length > 1;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-otb-page">
        <Loader2 className="h-10 w-10 animate-spin text-[#e51b23]" />
      </div>
    );
  }

  if (error === 'other') {
    return (
      <div className="section-container mx-auto max-w-lg py-16 text-center">
        <p className="mb-6 text-otb-text">{t('parts.detail.loadError')}</p>
        <Link
          href="/parts"
          className="text-sm font-semibold text-[#f59e0b] hover:underline"
        >
          {t('parts.detail.back')}
        </Link>
      </div>
    );
  }

  if (error === 'notfound' || !part) {
    return (
      <div className="section-container mx-auto max-w-lg py-16 text-center">
        <Package className="mx-auto mb-4 h-14 w-14 text-otb-text/15" />
        <h1 className="font-display mb-2 text-2xl font-bold text-otb-text">
          {t('parts.detail.notFound')}
        </h1>
        <Link
          href="/parts"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#f59e0b] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('parts.detail.back')}
        </Link>
      </div>
    );
  }

  const outOfStock = part.stockQuantity === 0;

  function stepPhoto(dir: -1 | 1) {
    if (photos.length <= 1) return;
    setActivePhoto((i) => (i + dir + photos.length) % photos.length);
  }

  function handleAddToCart() {
    if (!part || outOfStock) return;
    addItem(part);
    toast.success(t('parts.toast.added', { name: part.name }), { duration: 1500 });
  }

  return (
    <div className="min-h-screen bg-otb-page race-stripes pb-12">
      <div className="border-b border-otb-border bg-otb-surface pt-[env(safe-area-inset-top)]">
        <div className="section-container py-3 md:py-4">
          <Link
            href="/parts"
            className="inline-flex min-h-[44px] items-center gap-2 py-1 text-sm font-semibold text-otb-text/70 touch-manipulation transition-colors hover:text-otb-text"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {t('parts.detail.back')}
          </Link>
        </div>
      </div>

      <div className="section-container max-w-6xl py-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-7">
            <div className="overflow-hidden border border-otb-border bg-otb-surface">
              <div className="relative aspect-square w-full bg-otb-page sm:aspect-[4/3]">
                {photos[activePhoto] ? (
                  <img
                    src={photos[activePhoto]}
                    alt={part.name}
                    className="absolute inset-0 h-full w-full object-contain p-4"
                  />
                ) : (
                  <div className="flex h-full min-h-[240px] items-center justify-center">
                    <Package className="h-16 w-16 text-otb-text/10" />
                  </div>
                )}
                {showArrows && (
                  <>
                    <button
                      type="button"
                      onClick={() => stepPhoto(-1)}
                      className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-otb-border bg-otb-surface/95 text-otb-text shadow-sm hover:bg-otb-elevated sm:left-4 sm:h-11 sm:w-11"
                      aria-label={t('marketplace.detail.photoPrev')}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepPhoto(1)}
                      className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-otb-border bg-otb-surface/95 text-otb-text shadow-sm hover:bg-otb-elevated sm:right-4 sm:h-11 sm:w-11"
                      aria-label={t('marketplace.detail.photoNext')}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {showArrows && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {photos.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    className={cn(
                      'relative h-14 w-14 shrink-0 overflow-hidden border-2 sm:h-16 sm:w-16',
                      i === activePhoto ? 'border-[#f59e0b]' : 'border-transparent ring-1 ring-otb-border',
                    )}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col lg:col-span-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-otb-text/40">
              {part.category?.name ?? '—'}
            </p>
            <h1 className="font-display mt-2 text-2xl font-black uppercase leading-tight text-otb-text md:text-3xl">
              {part.name}
            </h1>
            <p className="mt-2 text-sm text-otb-text/50">
              {t('parts.detail.soldBy')}: <span className="font-semibold text-otb-text/80">{part.shop.name}</span>
            </p>

            <p className="mt-6 font-display text-3xl font-black tabular-nums text-[#f59e0b] md:text-4xl">
              {t('common.lkr')} {Number(part.price).toLocaleString(locale)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {outOfStock ? (
                <span className="rounded bg-[#e51b23]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#e51b23]">
                  {t('parts.outOfStock')}
                </span>
              ) : (
                <span className="rounded bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  {t('parts.inStock')} · {part.stockQuantity}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={outOfStock}
              onClick={handleAddToCart}
              className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center gap-2 bg-[#f59e0b] px-6 py-3 text-sm font-bold uppercase tracking-wider text-neutral-950 transition-colors hover:bg-[#e08e00] disabled:opacity-40 sm:w-auto sm:min-w-[200px]"
            >
              <ShoppingCart className="h-5 w-5" />
              {t('parts.addToCart')}
            </button>

            {part.compatibleBikes.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-otb-text/40">
                  {t('parts.compatible')}
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {part.compatibleBikes.map((b) => (
                    <span
                      key={b}
                      className="bg-otb-text/[0.06] px-2 py-1 text-xs font-bold uppercase tracking-wide text-otb-text/60"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {part.description && (
              <div className="mt-8 border-t border-otb-border pt-8">
                <h2 className="font-display text-lg font-bold text-otb-text">
                  {t('parts.detail.description')}
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-otb-text sm:text-base">
                  {part.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
