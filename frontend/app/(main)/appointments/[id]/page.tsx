'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Wrench,
  CheckCircle,
  Package,
  X,
} from 'lucide-react';
import { appointments as apptApi } from '@/lib/api';
import type { Appointment } from '@/lib/types';
import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import type { MessageKey } from '@/lib/messages';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]' },
  INSPECTED: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  WAITING_FOR_PARTS: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  REPAIRED: { bg: 'bg-green-500/15', text: 'text-green-400' },
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  PENDING: Clock,
  INSPECTED: CheckCircle,
  WAITING_FOR_PARTS: Package,
  REPAIRED: CheckCircle,
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const s = STATUS_STYLE[status] ?? { bg: 'bg-otb-text/10', text: 'text-otb-text/50' };
  const Icon = STATUS_ICONS[status] ?? Clock;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', s.bg, s.text)}>
      <Icon className="h-3 w-3" />
      {t(`status.${status}` as MessageKey)}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 py-3 border-b border-otb-border last:border-0">
      <span className="text-otb-text/35 text-xs font-bold uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-otb-text text-sm font-semibold sm:text-right break-words">{value}</span>
    </div>
  );
}

export default function AppointmentDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t, locale } = useLanguage();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photoViewer, setPhotoViewer] = useState<{ urls: string[]; index: number } | null>(null);

  const openPhotoViewer = useCallback((urls: string[], index: number) => {
    if (urls.length === 0) return;
    setPhotoViewer({ urls, index: Math.min(Math.max(0, index), urls.length - 1) });
  }, []);

  const closePhotoViewer = useCallback(() => setPhotoViewer(null), []);

  const stepPhotoViewer = useCallback((dir: -1 | 1) => {
    setPhotoViewer((v) => {
      if (!v || v.urls.length <= 1) return v;
      return { ...v, index: (v.index + dir + v.urls.length) % v.urls.length };
    });
  }, []);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setLoadError(false);
    try {
      const { appointment } = await apptApi.byId(id);
      setAppt(appointment);
    } catch (e) {
      setAppt(null);
      if (e instanceof ApiClientError && (e.status === 404 || e.status === 403)) setNotFound(true);
      else setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?next=/appointments/${encodeURIComponent(id)}`);
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, load, router, id]);

  useEffect(() => {
    if (!photoViewer) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [photoViewer]);

  useEffect(() => {
    if (!photoViewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePhotoViewer();
      if (photoViewer.urls.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepPhotoViewer(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepPhotoViewer(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photoViewer, closePhotoViewer, stepPhotoViewer]);

  if (authLoading || (loading && isAuthenticated)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-otb-page race-stripes">
        <Loader2 className="h-8 w-8 animate-spin text-[#e51b23]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-otb-page race-stripes section-container py-16 text-center">
        <p className="text-otb-text/60 max-w-md mx-auto">{t('dashboard.toast.appointmentsError')}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-6 px-5 py-3 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-xs font-bold uppercase tracking-wider"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (notFound || !appt) {
    return (
      <div className="min-h-screen bg-otb-page race-stripes section-container py-16">
        <p className="text-otb-text/60 text-center max-w-md mx-auto">{t('appointment.detail.notFound')}</p>
        <div className="flex justify-center mt-8">
          <Link
            href="/dashboard?tab=appointments"
            className="inline-flex items-center gap-2 px-5 py-3 border border-otb-text/20 text-otb-text text-xs font-bold uppercase tracking-wider hover:border-otb-text/35 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> {t('appointment.detail.back')}
          </Link>
        </div>
      </div>
    );
  }

  const bike = appt.serviceBike;
  const issueLabel = t(`issue.${appt.issueCategory}` as MessageKey);
  const engineLabel = bike.engineType ? t(`engine.${bike.engineType}` as MessageKey) : null;

  return (
    <div className="min-h-screen bg-otb-page race-stripes">
      <div className="border-b border-otb-border bg-otb-surface">
        <div className="section-container py-6 md:py-8 relative overflow-hidden">
          <span aria-hidden className="absolute -right-2 top-0 text-[100px] font-black text-otb-text/[0.04] leading-none select-none uppercase hidden md:block">
            {t('workshop.ghostTitle')}
          </span>
          <Link
            href="/dashboard?tab=appointments"
            className="inline-flex items-center gap-2 text-otb-text/50 hover:text-otb-text text-xs font-bold uppercase tracking-wider mb-4 relative z-10"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t('appointment.detail.back')}
          </Link>
          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <div className="flex h-10 w-10 items-center justify-center bg-[#e51b23]">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl font-black text-otb-text uppercase tracking-tight">
                {t('appointment.detail.title')}
              </h1>
              <StatusBadge status={appt.status} />
            </div>
          </div>
          <p className="text-otb-text/40 text-sm mt-2 relative z-10 font-mono">{bike.registrationPlate}</p>
        </div>
      </div>

      <div className="section-container py-8 max-w-2xl">
        <div className="border border-otb-border bg-otb-surface p-5 sm:p-8">
          <DetailRow label={t('workshop.review.issue')} value={issueLabel} />
          <DetailRow
            label={t('workshop.review.plate')}
            value={
              <>
                {bike.registrationPlate}
                {bike.brand && ` · ${bike.brand.name}`}
                {bike.model && ` ${bike.model}`}
                {bike.year != null && ` (${bike.year})`}
              </>
            }
          />
          {engineLabel && <DetailRow label={t('workshop.engine')} value={engineLabel} />}
          <DetailRow label={t('workshop.phone')} value={appt.contactPhone} />
          <DetailRow
            label={t('workshop.date')}
            value={new Date(appt.preferredDate).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
          />
          {appt.customerMessage && (
            <DetailRow label={t('appointment.detail.yourMessage')} value={appt.customerMessage} />
          )}
          {appt.estimatedCost && (
            <DetailRow
              label={t('dashboard.estimatedCost')}
              value={`${t('common.lkr')} ${Number(appt.estimatedCost).toLocaleString()}`}
            />
          )}
          {appt.finalCost && (
            <DetailRow
              label={t('appointment.detail.finalCost')}
              value={`${t('common.lkr')} ${Number(appt.finalCost).toLocaleString()}`}
            />
          )}
          {appt.adminNotes && (
            <DetailRow label={t('appointment.detail.workshopNotes')} value={appt.adminNotes} />
          )}
          <DetailRow
            label={t('appointment.detail.bookedAt')}
            value={new Date(appt.createdAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
          />
        </div>

        {appt.preInspectionPhotos.length > 0 && (
          <div className="mt-8 border border-otb-border bg-otb-surface p-5 sm:p-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-otb-text/45 mb-4">
              {t('appointment.detail.issuePhotos')}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {appt.preInspectionPhotos.map((url, photoIdx) => (
                <button
                  key={`${appt.id}-${photoIdx}-${url}`}
                  type="button"
                  onClick={() => openPhotoViewer(appt.preInspectionPhotos, photoIdx)}
                  className="aspect-square overflow-hidden rounded-lg border border-otb-border bg-otb-page ring-offset-2 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e51b23]"
                  aria-label={t('appointment.detail.viewPhoto')}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {photoViewer && photoViewer.urls[photoViewer.index] && (
        <div
          className="fixed inset-0 z-[250] flex flex-col bg-black/92"
          role="dialog"
          aria-modal
          aria-label={t('appointment.detail.photoViewer')}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white">
            <span className="text-sm tabular-nums text-white/90">
              {photoViewer.index + 1} / {photoViewer.urls.length}
            </span>
            <button
              type="button"
              onClick={closePhotoViewer}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label={t('common.close')}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            {photoViewer.urls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => stepPhotoViewer(-1)}
                  className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:left-4"
                  aria-label={t('marketplace.detail.photoPrev')}
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  type="button"
                  onClick={() => stepPhotoViewer(1)}
                  className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-4"
                  aria-label={t('marketplace.detail.photoNext')}
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}
            <button
              type="button"
              className="flex h-full w-full cursor-default items-center justify-center p-4 outline-none"
              onClick={closePhotoViewer}
              aria-label={t('common.close')}
            >
              <span
                role="presentation"
                className="max-h-[min(85dvh,calc(100dvh-6rem))] max-w-[min(100vw-2rem,1200px)]"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={photoViewer.urls[photoViewer.index]}
                  alt=""
                  className="max-h-[85dvh] max-w-[min(100vw-2rem,1200px)] object-contain"
                  draggable={false}
                />
              </span>
            </button>
          </div>
          <p className="pointer-events-none shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[11px] text-white/45">
            {t('appointment.detail.photoHint')}
          </p>
        </div>
      )}
    </div>
  );
}
