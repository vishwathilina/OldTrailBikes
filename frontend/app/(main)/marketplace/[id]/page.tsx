'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Bike,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  ShieldCheck,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { toast } from 'sonner';
import { bikes as bikesApi, ApiClientError } from '@/lib/api';
import type { BikeForSale } from '@/lib/types';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { MessageKey } from '@/lib/messages';
import { cn } from '@/lib/utils';
import { buildMarketplaceSlug } from '@/lib/marketplace-slug';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** OLX-style grid: on mobile, each logical row is 2×2 (label|value)²; md+ is one row of four cells. */
function SpecPairRow({
  a,
  b,
}: {
  a: { label: string; value: string };
  b: { label: string; value: string };
}) {
  return (
    <div className="grid grid-cols-2 border-b border-neutral-200 last:border-b-0 md:grid-cols-4">
      <div className="min-w-0 border-b border-neutral-200 bg-neutral-50 px-2.5 py-3 text-[11px] font-medium leading-snug text-otb-text sm:px-3 sm:py-2.5 sm:text-xs md:border-b-0 md:border-r md:text-sm">
        {a.label}
      </div>
      <div className="min-w-0 border-b border-neutral-200 bg-white px-2.5 py-3 text-[11px] font-bold leading-snug text-otb-text sm:px-3 sm:py-2.5 sm:text-sm md:border-b-0 md:border-r md:break-words">
        {a.value}
      </div>
      <div className="min-w-0 border-b border-neutral-200 bg-neutral-50 px-2.5 py-3 text-[11px] font-medium leading-snug text-otb-text sm:px-3 sm:py-2.5 sm:text-xs md:border-b-0 md:border-r md:text-sm">
        {b.label}
      </div>
      <div className="min-w-0 bg-white px-2.5 py-3 text-[11px] font-bold leading-snug text-otb-text sm:px-3 sm:py-2.5 sm:text-sm md:break-words">{b.value}</div>
    </div>
  );
}

export default function MarketplaceListingDetailPage() {
  const params = useParams();
  const slugOrId = typeof params.id === 'string' ? decodeURIComponent(params.id) : '';
  const { t, language, locale } = useLanguage();
  const [listing, setListing] = useState<BikeForSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'notfound' | 'other' | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const [lbZoom, setLbZoom] = useState(1);
  const lbScrollRef = useRef<HTMLDivElement>(null);

  const photosLen = listing?.photos?.length ?? 0;

  const stepMainPhoto = useCallback(
    (dir: -1 | 1) => {
      if (photosLen <= 0) return;
      setActivePhoto((i) => (i + dir + photosLen) % photosLen);
    },
    [photosLen],
  );

  const stepLbPhoto = useCallback(
    (dir: -1 | 1) => {
      if (photosLen <= 0) return;
      setLbZoom(1);
      setLbIndex((i) => (i + dir + photosLen) % photosLen);
    },
    [photosLen],
  );

  const openLightbox = useCallback(() => {
    setLbIndex(activePhoto);
    setLbZoom(1);
    setLightboxOpen(true);
  }, [activePhoto]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLbZoom(1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    async function loadBySlugOrId() {
      if (!slugOrId) {
        setError('notfound');
        setLoading(false);
        return;
      }
      try {
        if (UUID_RE.test(slugOrId)) {
          const r = await bikesApi.byId(slugOrId);
          if (!cancelled) {
            setListing(r.listing);
            setActivePhoto(0);
          }
          return;
        }

        const pageSize = 48;
        let page = 1;
        let total = 0;
        let found: BikeForSale | null = null;

        do {
          const res = await bikesApi.list({ page, pageSize });
          total = res.total;
          found = res.items.find((bike) => buildMarketplaceSlug(bike) === slugOrId) ?? null;
          if (found) break;
          page += 1;
        } while ((page - 1) * pageSize < total);

        if (!found) {
          if (!cancelled) setError('notfound');
          return;
        }

        if (!cancelled) {
          setListing(found);
          setActivePhoto(0);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof ApiClientError && (err.status === 404 || err.status === 400)) {
          setError('notfound');
        } else {
          setError('other');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadBySlugOrId();

    return () => {
      cancelled = true;
    };
  }, [slugOrId]);

  function scrollThumbs(dir: -1 | 1) {
    const el = thumbStripRef.current;
    if (!el) return;
    const amount = Math.min(280, el.clientWidth * 0.6);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = listing ? `${listing.brand?.name ?? ''} ${listing.model}`.trim() : '';
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t('marketplace.detail.linkCopied'));
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t('marketplace.detail.linkCopied'));
      } catch {
        toast.error(t('marketplace.detail.loadError'));
      }
    }
  }

  useEffect(() => {
    if (!lightboxOpen) return;
    setActivePhoto(lbIndex);
  }, [lbIndex, lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const el = lbScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.12;
      setLbZoom((z) => Math.min(4, Math.max(1, Math.round((z + delta) * 100) / 100)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen || !lbScrollRef.current) return;
    lbScrollRef.current.scrollTop = 0;
    lbScrollRef.current.scrollLeft = 0;
  }, [lbIndex, lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
        return;
      }
      if (photosLen <= 1) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepLbPhoto(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepLbPhoto(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, photosLen, stepLbPhoto, closeLightbox]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#e51b23]" />
      </div>
    );
  }

  if (error === 'other') {
    return (
      <div className="section-container mx-auto max-w-lg py-16 text-center md:py-24">
        <p className="mb-6 text-otb-text">{t('marketplace.detail.loadError')}</p>
        <Link href="/marketplace" className="text-sm font-semibold text-[#e51b23] hover:underline">
          {t('marketplace.detail.back')}
        </Link>
      </div>
    );
  }

  if (error === 'notfound' || !listing) {
    return (
      <div className="section-container mx-auto max-w-lg py-16 text-center md:py-24">
        <Bike className="mx-auto mb-4 h-14 w-14 text-neutral-200" />
        <h1 className="font-display mb-2 text-2xl font-bold text-otb-text">{t('marketplace.detail.notFound')}</h1>
        <Link
          href="/marketplace"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#e51b23] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('marketplace.detail.back')}
        </Link>
      </div>
    );
  }

  const engineLabel =
    listing.engineType === 'TWO_STROKE'
      ? t('marketplace.engine.2t')
      : listing.engineType === 'FOUR_STROKE'
        ? t('marketplace.engine.4t')
        : t('engine.ELECTRIC');

  const listedAgo = formatDistanceToNow(new Date(listing.createdAt), {
    addSuffix: true,
    locale: language === 'EN' ? enUS : undefined,
  });

  const titleLine = `${listing.brand?.name ?? ''} ${listing.model}`.trim();

  const fuelStr =
    listing.fuelConsumption != null && Number.isFinite(Number(listing.fuelConsumption))
      ? String(listing.fuelConsumption)
      : null;

  const fuelDisplay = fuelStr ?? '—';

  const stockRef = `OTB-${listing.id.replace(/-/g, '').slice(0, 10).toUpperCase()}`;

  const photos = listing.photos.length > 0 ? listing.photos : [];
  const showThumbNav = photos.length > 1;

  return (
    <div className="min-h-screen bg-white pb-[max(4rem,env(safe-area-inset-bottom,0px))]">
      <div className="border-b border-neutral-200/80 bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="section-container py-3 md:py-5">
          <Link
            href="/marketplace"
            className="inline-flex min-h-[44px] items-center gap-2 py-1 text-sm font-semibold text-neutral-600 touch-manipulation transition-colors hover:text-otb-text active:text-otb-text"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {t('marketplace.detail.back')}
          </Link>
        </div>
      </div>

      <div className="section-container max-w-6xl py-5 md:py-10">
        {/* Top: stack on mobile; image left + panel right on lg */}
        <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-8">
          {/* Main image */}
          <div className="min-w-0 lg:col-span-7">
            <div className="overflow-hidden rounded-lg border border-neutral-200/90 bg-neutral-100 sm:rounded-xl">
              <div className="relative aspect-[4/3] w-full bg-neutral-100">
                {photos[activePhoto] ? (
                  <>
                    <img
                      src={photos[activePhoto]}
                      alt={titleLine}
                      className="absolute inset-0 z-0 h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={openLightbox}
                      className="absolute inset-0 z-10 block h-full w-full cursor-zoom-in bg-transparent"
                      aria-label={t('marketplace.detail.gallery.open')}
                    />
                    {showThumbNav && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            stepMainPhoto(-1);
                          }}
                          className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/95 text-otb-text shadow-md backdrop-blur-sm transition-colors hover:bg-white active:bg-neutral-100 sm:left-3 sm:h-11 sm:w-11"
                          aria-label={t('marketplace.detail.photoPrev')}
                        >
                          <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            stepMainPhoto(1);
                          }}
                          className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/95 text-otb-text shadow-md backdrop-blur-sm transition-colors hover:bg-white active:bg-neutral-100 sm:right-3 sm:h-11 sm:w-11"
                          aria-label={t('marketplace.detail.photoNext')}
                        >
                          <ChevronRight className="h-6 w-6" strokeWidth={2} />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex h-full min-h-[min(60vw,280px)] w-full items-center justify-center">
                    <Bike className="h-16 w-16 text-neutral-200" />
                  </div>
                )}
                {listing.isMechanicVerified && (
                  <div className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-md bg-emerald-700/95 px-2.5 py-1.5 shadow-sm">
                    <ShieldCheck className="h-3.5 w-3.5 text-white" />
                    <span className="text-[11px] font-semibold text-white">{t('marketplace.verified')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product panel — min-w-0 so the specs table cannot blow out the grid */}
          <div className="flex min-w-0 flex-col lg:col-span-5">
            <div className="border-b border-neutral-200 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-xl font-bold leading-tight tracking-tight text-otb-text sm:text-2xl md:text-3xl">
                      {listing.brand?.name} {listing.model}
                    </h1>
                    {listing.isMechanicVerified && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                        {t('marketplace.verified')}
                      </span>
                    )}
                  </div>
                  <p className="font-display mt-3 text-[clamp(1.5rem,6.5vw,2.25rem)] font-black leading-none tracking-tight text-otb-text">
                    {t('common.lkr')} {Number(listing.price).toLocaleString(locale)}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-0.5 sm:gap-1">
                  <button
                    type="button"
                    onClick={() => setFavorited((v) => !v)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-otb-text touch-manipulation transition-colors hover:bg-neutral-100 active:bg-neutral-100"
                    aria-pressed={favorited}
                    aria-label={t('marketplace.detail.favorite')}
                  >
                    <Heart
                      className={cn('h-6 w-6', favorited ? 'fill-[#e51b23] text-[#e51b23]' : 'text-otb-text')}
                      strokeWidth={favorited ? 0 : 1.75}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleShare()}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[#2563eb] touch-manipulation transition-colors hover:bg-neutral-100 active:bg-neutral-100"
                    aria-label={t('marketplace.detail.share')}
                  >
                    <Share2 className="h-6 w-6" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
              <div className="flex min-w-0 items-start gap-1.5 text-otb-text">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" aria-hidden />
                <span className="leading-snug break-words">{listing.location}</span>
              </div>
              <span className="shrink-0 text-neutral-500 sm:ml-auto sm:text-right">{listedAgo}</span>
            </div>

            {(listing.whatsappNumber || listing.phoneNumber) && (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:gap-2">
                {listing.whatsappNumber && (
                  <a
                    href={`https://wa.me/${listing.whatsappNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white touch-manipulation transition-colors hover:bg-emerald-500 active:bg-emerald-700"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    {t('marketplace.contact.whatsapp')}
                  </a>
                )}
                {listing.phoneNumber && (
                  <a
                    href={`tel:${listing.phoneNumber}`}
                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-3 text-sm font-semibold text-otb-text touch-manipulation transition-colors hover:border-neutral-300 active:bg-neutral-50"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    {t('marketplace.contact.call')}
                  </a>
                )}
              </div>
            )}

            <div className="mt-7 border-t border-neutral-200 pt-6 sm:mt-8">
              <h2 className="font-display text-base font-bold text-otb-text sm:text-lg">{t('marketplace.detail.specsHeading')}</h2>
              <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
                <SpecPairRow
                  a={{ label: t('marketplace.detail.make'), value: listing.brand?.name ?? '—' }}
                  b={{ label: t('marketplace.detail.model'), value: listing.model }}
                />
                <SpecPairRow
                  a={{ label: t('marketplace.detail.year'), value: String(listing.year) }}
                  b={{ label: t('marketplace.detail.engineType'), value: engineLabel }}
                />
                <SpecPairRow
                  a={{
                    label: t('marketplace.detail.kmDriven'),
                    value: listing.mileageKm.toLocaleString(locale),
                  }}
                  b={{ label: t('marketplace.detail.fuelRow'), value: fuelDisplay }}
                />
                <SpecPairRow
                  a={{
                    label: t('marketplace.detail.statusLabel'),
                    value: t(`status.${listing.status}` as MessageKey),
                  }}
                  b={{ label: t('marketplace.detail.stock'), value: stockRef }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail strip — full width under the side-by-side block */}
        {showThumbNav && (
          <div className="relative mt-6 sm:mt-8">
            <button
              type="button"
              onClick={() => scrollThumbs(-1)}
              className="absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-otb-text shadow-sm backdrop-blur-sm transition-colors hover:bg-neutral-50 active:bg-neutral-100 sm:left-0 sm:h-9 sm:w-9"
              aria-label="Previous photos"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollThumbs(1)}
              className="absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-otb-text shadow-sm backdrop-blur-sm transition-colors hover:bg-neutral-50 active:bg-neutral-100 sm:right-0 sm:h-9 sm:w-9"
              aria-label="Next photos"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div
              ref={thumbStripRef}
              className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-12 py-2 [scrollbar-width:none] sm:px-11 [&::-webkit-scrollbar]:hidden"
            >
              {photos.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setActivePhoto(i)}
                  className={cn(
                    'relative h-[52px] min-h-[48px] w-[5.5rem] shrink-0 snap-start overflow-hidden rounded-md border-2 transition-colors touch-manipulation sm:h-[72px] sm:w-28',
                    i === activePhoto ? 'border-[#e51b23]' : 'border-transparent ring-1 ring-neutral-200 active:opacity-90',
                  )}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mt-8 max-w-3xl border-t border-neutral-100 pt-8 sm:mt-10 sm:pt-10 lg:mt-12 lg:pt-12">
          <h2 className="font-display text-lg font-bold tracking-tight text-otb-text sm:text-xl md:text-2xl">
            {t('marketplace.detail.description')}
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-otb-text sm:mt-4 sm:text-base">
            {listing.description}
          </p>
          <p className="mt-6 text-xs leading-relaxed text-neutral-500 sm:mt-8">
            {t('marketplace.detail.seller')}: {listing.seller.fullName}
            {' · '}
            {t('marketplace.detail.posted')}{' '}
            {new Date(listing.createdAt).toLocaleDateString(locale, { dateStyle: 'medium' })}
          </p>
        </div>
      </div>

      {lightboxOpen && photos[lbIndex] && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black"
          role="dialog"
          aria-modal
          aria-label={t('marketplace.detail.gallery.open')}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white">
            <span className="text-sm tabular-nums text-white/90">
              {lbIndex + 1} / {photos.length}
            </span>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setLbZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                aria-label={t('marketplace.detail.gallery.zoomOut')}
                disabled={lbZoom <= 1}
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setLbZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                aria-label={t('marketplace.detail.gallery.zoomIn')}
                disabled={lbZoom >= 4}
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setLbZoom(1)}
                className="hidden rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 sm:inline-flex"
                aria-label={t('marketplace.detail.gallery.resetZoom')}
              >
                1×
              </button>
              <button
                type="button"
                onClick={closeLightbox}
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label={t('marketplace.detail.gallery.close')}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1">
            {showThumbNav && (
              <>
                <button
                  type="button"
                  onClick={() => stepLbPhoto(-1)}
                  className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-white/25 sm:left-4 sm:h-12 sm:w-12"
                  aria-label={t('marketplace.detail.photoPrev')}
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  type="button"
                  onClick={() => stepLbPhoto(1)}
                  className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-white/25 sm:right-4 sm:h-12 sm:w-12"
                  aria-label={t('marketplace.detail.photoNext')}
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}
            <div
              ref={lbScrollRef}
              className="h-full overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
            >
              <div className="flex min-h-full min-w-full items-center justify-center p-6 sm:p-10">
                <button
                  type="button"
                  className="relative max-w-full border-0 bg-transparent p-0"
                  onDoubleClick={() => setLbZoom((z) => (z > 1 ? 1 : 2))}
                  aria-label={t('marketplace.detail.gallery.open')}
                >
                  <div
                    style={{
                      transform: `scale(${lbZoom})`,
                      transition: 'transform 0.15s ease-out',
                      transformOrigin: 'center center',
                    }}
                    className="inline-block"
                  >
                    <img
                      src={photos[lbIndex]}
                      alt=""
                      className="max-h-[min(85vh,900px)] max-w-[min(100vw-2rem,1200px)] select-none object-contain"
                      draggable={false}
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>

          <p className="pointer-events-none shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[10px] leading-snug text-white/45 sm:text-[11px]">
            <span className="tabular-nums">{lbZoom.toFixed(2)}×</span>
            {' · '}
            {t('marketplace.detail.gallery.footerHint')}
          </p>
        </div>
      )}
    </div>
  );
}
