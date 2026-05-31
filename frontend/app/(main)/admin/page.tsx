'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { appointments as apptApi, ApiClientError } from '@/lib/api';
import type { Appointment, AppointmentStatus } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { MessageKey } from '@/lib/messages';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const STATUSES: AppointmentStatus[] = ['PENDING', 'INSPECTED', 'WAITING_FOR_PARTS', 'REPAIRED'];

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-[#f59e0b]/15 text-[#f59e0b]',
  INSPECTED: 'bg-blue-500/15 text-blue-400',
  WAITING_FOR_PARTS: 'bg-orange-500/15 text-orange-400',
  REPAIRED: 'bg-green-500/15 text-green-400',
};

export default function AdminWorkshopPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [newStatus, setNewStatus] = useState<AppointmentStatus>('PENDING');
  const [estimatedInput, setEstimatedInput] = useState('');
  const [finalInput, setFinalInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);
  /** In-page fullscreen photo viewer (issue photos); not a separate route */
  const [photoViewer, setPhotoViewer] = useState<{ urls: string[]; index: number } | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
    setLoading(true);
    try {
      const res = await apptApi.listAll({
        status: statusFilter || undefined,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      toast.error(t('admin.loadError'));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/admin');
      return;
    }
    if (user?.role !== 'ADMIN') {
      toast.error(t('admin.forbidden'));
      router.replace('/');
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, user?.role, load, router, t]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

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

  function openEdit(appt: Appointment) {
    setSelected(appt);
    setNewStatus(appt.status);
    setEstimatedInput(appt.estimatedCost != null ? String(appt.estimatedCost) : '');
    setFinalInput(appt.finalCost != null ? String(appt.finalCost) : '');
    setNotesInput(appt.adminNotes ?? '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!selected) return;
    const estimatedCost = estimatedInput.trim() === '' ? undefined : parseFloat(estimatedInput);
    const finalCost = finalInput.trim() === '' ? undefined : parseFloat(finalInput);
    if (estimatedCost !== undefined && Number.isNaN(estimatedCost)) {
      toast.error(t('admin.toast.error'));
      return;
    }
    if (finalCost !== undefined && Number.isNaN(finalCost)) {
      toast.error(t('admin.toast.error'));
      return;
    }
    setSaving(true);
    try {
      if (newStatus !== selected.status) {
        await apptApi.transition(selected.id, {
          status: newStatus,
          estimatedCost,
          finalCost,
          adminNotes: notesInput.trim() || undefined,
        });
      } else {
        await apptApi.update(selected.id, {
          estimatedCost,
          finalCost,
          adminNotes: notesInput.trim() || undefined,
        });
      }
      toast.success(t('admin.toast.saved'));
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t('admin.toast.error'));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-otb-page race-stripes">
        <Loader2 className="h-8 w-8 animate-spin text-[#e51b23]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-otb-page race-stripes">
      <div className="border-b border-otb-border bg-otb-surface">
        <div className="section-container py-6 md:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-[#e51b23] text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-otb-text uppercase tracking-tight">
                  {t('admin.title')}
                </h1>
                <p className="text-otb-text/55 text-sm mt-1">{t('admin.sub')}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/shops">{t('admin.shops.title')}</Link>
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              className={cn(
                'w-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors sm:w-auto',
                statusFilter === ''
                  ? 'border-otb-text bg-otb-text text-white'
                  : 'border-otb-border text-otb-text/70 hover:border-otb-text/30',
              )}
            >
              {t('admin.filter.all')}
            </button>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'w-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors sm:w-auto',
                  statusFilter === s
                    ? 'border-otb-text bg-otb-text text-white'
                    : 'border-otb-border text-otb-text/70 hover:border-otb-text/30',
                )}
              >
                {t(`status.${s}` as MessageKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section-container py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#e51b23]" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-otb-text/50 py-16">{t('admin.empty')}</p>
        ) : (
          <ul className="space-y-4">
            {items.map((appt) => {
              const bike = appt.serviceBike;
              const issueLabel = t(`issue.${appt.issueCategory}` as MessageKey);
              const badge = STATUS_BADGE[appt.status] ?? 'bg-otb-text/10 text-otb-text/60';
              return (
                <li
                  key={appt.id}
                  className="border border-otb-border bg-otb-surface p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', badge)}>
                        {t(`status.${appt.status}` as MessageKey)}
                      </span>
                      <span className="font-mono text-sm font-semibold text-otb-text">{bike.registrationPlate}</span>
                      {bike.brand && <span className="text-otb-text/60 text-sm">{bike.brand.name}</span>}
                    </div>
                    <p className="text-sm text-otb-text">
                      <span className="text-otb-text/45 text-xs font-bold uppercase tracking-wider mr-2">{t('admin.customer')}</span>
                      {appt.customer.fullName} · {appt.customer.email}
                    </p>
                    <p className="text-sm text-otb-text">
                      <span className="text-otb-text/45 text-xs font-bold uppercase tracking-wider mr-2">{t('workshop.review.issue')}</span>
                      {issueLabel}
                    </p>
                    <p className="text-xs text-otb-text/50">
                      {t('admin.preferred')}:{' '}
                      {new Date(appt.preferredDate).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {appt.preInspectionPhotos.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-otb-text/40 mb-2">
                          {t('appointment.detail.issuePhotos')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {appt.preInspectionPhotos.map((url, photoIdx) => (
                            <button
                              key={`${appt.id}-${photoIdx}-${url}`}
                              type="button"
                              onClick={() => openPhotoViewer(appt.preInspectionPhotos, photoIdx)}
                              className="h-16 w-16 shrink-0 overflow-hidden rounded border border-otb-border bg-otb-page ring-offset-2 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e51b23]"
                              aria-label={t('admin.issuePhotoOpen')}
                            >
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 shrink-0 sm:grid-cols-3 lg:grid-cols-1 w-full lg:w-auto">
                    <Button variant="outline" size="sm" className="otb-nav-figtree w-full justify-center" asChild>
                      <a href={`tel:${appt.contactPhone}`}>
                        <Phone className="h-4 w-4 mr-1" />
                        {t('admin.call')}
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="otb-nav-figtree w-full justify-center" asChild>
                      <Link href={`/appointments/${appt.id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        {t('admin.openDetail')}
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="w-full justify-center bg-[#e51b23] hover:bg-[#ff1f28] text-white"
                      onClick={() => openEdit(appt)}
                    >
                      {t('admin.update')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-otb-border pt-6">
            <p className="text-sm text-otb-text/50">
              {t('admin.page', { page, totalPages })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('common.back')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="otb-nav-figtree max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.dialogTitle')}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-otb-text/70 font-mono">{selected.serviceBike.registrationPlate}</p>
              <div className="space-y-2">
                <Label htmlFor="adm-status">{t('admin.newStatus')}</Label>
                <select
                  id="adm-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as AppointmentStatus)}
                  className="w-full rounded-md border border-otb-border bg-otb-surface px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`status.${s}` as MessageKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adm-est">{t('admin.estimatedCost')}</Label>
                <Input
                  id="adm-est"
                  type="number"
                  min={0}
                  step="0.01"
                  value={estimatedInput}
                  onChange={(e) => setEstimatedInput(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-otb-text/45">{t('admin.estimatedCostHint')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adm-fin">{t('admin.finalCost')}</Label>
                <Input
                  id="adm-fin"
                  type="number"
                  min={0}
                  step="0.01"
                  value={finalInput}
                  onChange={(e) => setFinalInput(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-otb-text/45">{t('admin.finalCostHint')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adm-notes">{t('admin.adminNotes')}</Label>
                <Textarea
                  id="adm-notes"
                  rows={3}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('admin.cancel')}
            </Button>
            <Button
              type="button"
              className="bg-[#e51b23] hover:bg-[#ff1f28] text-white"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('admin.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {photoViewer && photoViewer.urls[photoViewer.index] && (
        <div
          className="fixed inset-0 z-[250] flex flex-col bg-black/92"
          role="dialog"
          aria-modal
          aria-label={t('admin.issuePhotoViewer')}
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
              {/* Inner stopPropagation so clicking image doesn't close — only backdrop; user asked viewer not new tab */}
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
            {t('admin.issuePhotoHint')}
          </p>
        </div>
      )}
    </div>
  );
}
