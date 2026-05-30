'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Wrench, CheckCircle, Loader2, ArrowLeft, ArrowRight,
  Settings, Sliders, Zap, Link2, RotateCcw, Phone,
  ImagePlus, X,
} from 'lucide-react';
import { appointments as apptApi, brands as brandsApi } from '@/lib/api';
import type { Brand } from '@/lib/types';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { MessageKey } from '@/lib/messages';

// ─── Data ─────────────────────────────────────────────────────────────────────
const ISSUE_CATEGORIES = [
  { value: 'ENGINE_2_STROKE_REBUILD', Icon: Settings  },
  { value: 'ENGINE_4_STROKE_REBUILD', Icon: Settings  },
  { value: 'SUSPENSION_TUNING',       Icon: Sliders   },
  { value: 'BRAKE_REPAIR',            Icon: CheckCircle },
  { value: 'ELECTRICAL_FAULT',        Icon: Zap       },
  { value: 'DRIVE_ISSUE',             Icon: Link2     },
  { value: 'TYRE_WORK',               Icon: RotateCcw },
  { value: 'OTHER',                   Icon: Wrench    },
] as const;

const ENGINE_VALUES = ['TWO_STROKE', 'FOUR_STROKE', 'ELECTRIC'] as const;

// ─── Reusable field styles ────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-md border border-otb-border bg-otb-surface px-4 py-3 text-sm text-otb-text shadow-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e51b23]/20 focus:border-[#e51b23]/45 transition-colors';
const labelCls = 'text-sm font-medium text-otb-text block mb-2';
const errCls   = 'text-[#e51b23] text-xs mt-1';

type FormData = {
  registrationPlate: string;
  brandId?: string;
  model?: string;
  year?: number | '';
  engineType?: string;
  issueCategory: string;
  customerMessage?: string;
  contactPhone: string;
  preferredDate: string;
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WorkshopPage() {
  const { t }              = useLanguage();
  const { isAuthenticated } = useAuth();
  const router             = useRouter();
  const [step,       setStep]       = useState(0);
  const [allBrands,  setAllBrands]  = useState<Brand[]>([]);
  const [submitted,  setSubmitted]  = useState(false);
  const [issuePhotos, setIssuePhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const schema = useMemo(() => z.object({
    registrationPlate: z.string().min(3).transform(v => v.toUpperCase().replace(/\s/g, '')),
    brandId:           z.string().optional(),
    model:             z.string().optional(),
    year:              z.coerce.number().min(1970).max(new Date().getFullYear() + 1).optional().or(z.literal('')),
    engineType:        z.string().optional(),
    issueCategory:     z.string().min(1, t('workshop.validation.issue')),
    customerMessage:   z.string().max(1000).optional(),
    contactPhone:      z.string().min(9, t('workshop.validation.phone')),
    preferredDate:     z.string().min(1, t('workshop.validation.date')),
  }), [t]);

  const stepLabels = useMemo(() => [
    t('workshop.step.bike'),
    t('workshop.step.issue'),
    t('workshop.step.date'),
    t('workshop.step.confirm'),
  ], [t]);

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { issueCategory: '' } });

  const issueCategory = watch('issueCategory');
  const formValues    = watch();

  useEffect(() => { brandsApi.list().then(r => setAllBrands(r.brands)).catch(() => {}); }, []);

  useEffect(() => {
    const urls = issuePhotos.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [issuePhotos]);

  function onIssuePhotosChange(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setIssuePhotos((prev) => [...prev, ...list].slice(0, 6));
    e.target.value = '';
  }

  function removeIssuePhoto(index: number) {
    setIssuePhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function nextStep() {
    const fields: (keyof FormData)[][] = [
      ['registrationPlate'],
      ['issueCategory'],
      ['contactPhone', 'preferredDate'],
    ];
    if (await trigger(fields[step] as (keyof FormData)[])) setStep(s => s + 1);
  }

  async function onSubmit(data: FormData) {
    if (!isAuthenticated) { toast.error(t('workshop.toast.signIn')); router.push('/login'); return; }
    try {
      const { appointment } = await apptApi.create({
        registrationPlate: data.registrationPlate,
        brandId: data.brandId || undefined,
        model: data.model || undefined,
        year: data.year ? Number(data.year) : undefined,
        engineType: data.engineType || undefined,
        issueCategory: data.issueCategory,
        customerMessage: data.customerMessage || undefined,
        contactPhone: data.contactPhone,
        preferredDate: data.preferredDate,
      });
      if (issuePhotos.length > 0) {
        try {
          await apptApi.uploadPhotos(appointment.id, issuePhotos);
        } catch {
          toast.error(t('workshop.toast.photosFailed'));
        }
      }
      setSubmitted(true);
      toast.success(t('workshop.toast.received'));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('auth.error.generic'));
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] dark:bg-otb-page flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-green-600/15 border border-green-600/35 mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-otb-text">{t('workshop.bookingConfirmed')}</h2>
          <p className="text-otb-text text-sm mt-3 leading-relaxed">{t('workshop.success')}</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link href="/dashboard"
              className="flex-1 text-center rounded-md py-3 border border-otb-border bg-otb-surface text-otb-text text-sm font-semibold hover:bg-otb-page transition-colors">
              {t('workshop.myAppointments')}
            </Link>
            <button onClick={() => { setSubmitted(false); setStep(0); setIssuePhotos([]); }}
              className="flex-1 rounded-md py-3 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-sm font-semibold transition-colors">
              {t('workshop.bookAnother')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-otb-page">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="bg-otb-surface border-b border-otb-border">
        <div className="section-container py-6 md:py-8 relative overflow-hidden">
          <span aria-hidden className="absolute -right-2 top-0 text-[100px] md:text-[110px] font-black text-otb-text/[0.035] leading-none select-none hidden md:block">
            {t('workshop.ghostTitle')}
          </span>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <span className="h-px w-8 bg-otb-text/20" />
            <span className="text-otb-text text-xs font-medium">{t('workshop.headerEyebrow')}</span>
          </div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e51b23]">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-black text-otb-text tracking-tight leading-tight">{t('workshop.title')}</h1>
              <p className="text-otb-text text-sm mt-2 max-w-xl">{t('workshop.sub')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Step progress — numbered steps, sentence-case labels ───────── */}
      <div className="border-b border-otb-border bg-otb-surface">
        <div className="section-container py-4">
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-3">
            {stepLabels.map((s, i) => {
              const completed = i < step;
              const active = i === step;
              return (
                <li key={s} className="flex items-start gap-2.5 sm:flex-col sm:items-center sm:text-center sm:gap-1.5">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      active && 'bg-otb-text text-white',
                      completed && 'bg-emerald-600 text-white',
                      !active && !completed && 'border border-otb-border bg-otb-surface text-otb-text',
                    )}
                    aria-current={active ? 'step' : undefined}
                  >
                    {completed ? '✓' : i + 1}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-semibold leading-snug',
                      active && 'text-otb-text',
                      completed && 'text-emerald-800 dark:text-emerald-400',
                      !active && !completed && 'text-otb-text/80',
                    )}
                  >
                    {s}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <div className="section-container py-8 md:py-12 max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-xl border border-otb-border bg-otb-surface p-5 shadow-sm sm:p-8">

            {/* STEP 0: Bike Details */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>{t('workshop.plate')} *</label>
                  <input {...register('registrationPlate')} className={cn(inputCls, 'font-mono uppercase')} placeholder={t('workshop.placeholder.plate')} />
                  {errors.registrationPlate
                    ? <p className={errCls}>{errors.registrationPlate.message}</p>
                    : <p className="text-otb-text/80 text-[13px] mt-1.5 leading-snug">{t('workshop.plate.hint')}</p>}
                </div>

                <div>
                  <label className={labelCls}>{t('workshop.brand')}</label>
                  <select onChange={e => setValue('brandId', e.target.value)} className={inputCls}>
                    <option value="">{t('workshop.select.brand')}</option>
                    {allBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{t('workshop.model')}</label>
                    <input {...register('model')} className={inputCls} placeholder={t('workshop.placeholder.model')} />
                  </div>
                  <div>
                    <label className={labelCls}>{t('workshop.year')}</label>
                    <input {...register('year')} type="number" className={inputCls} placeholder={t('workshop.placeholder.year')} />
                    {errors.year && <p className={errCls}>{errors.year.message}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{t('workshop.engine')}</label>
                  <select onChange={e => setValue('engineType', e.target.value)} className={inputCls}>
                    <option value="">{t('workshop.select.engine')}</option>
                    {ENGINE_VALUES.map((value) => <option key={value} value={value}>{t(`engine.${value}` as MessageKey)}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* STEP 1: Issue */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>{t('workshop.issue')} *</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ISSUE_CATEGORIES.map(cat => (
                      <button key={cat.value} type="button" onClick={() => setValue('issueCategory', cat.value)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left text-sm font-medium transition-colors',
                          issueCategory === cat.value
                            ? 'border-otb-text bg-otb-text text-white'
                            : 'border-otb-border bg-otb-surface text-otb-text hover:border-otb-text/30 hover:bg-otb-page',
                        )}>
                        <cat.Icon className="h-4 w-4 shrink-0 opacity-90" />
                        <span className="leading-snug">{t(`issue.${cat.value}` as MessageKey)}</span>
                      </button>
                    ))}
                  </div>
                  {errors.issueCategory && <p className={errCls}>{errors.issueCategory.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>{t('workshop.message')}</label>
                  <textarea {...register('customerMessage')} rows={4} placeholder={t('workshop.placeholder.message')}
                    className={cn(inputCls, 'resize-none')} />
                </div>
                <div>
                  <label className={labelCls}>{t('workshop.issuePhotos')}</label>
                  <div className="rounded-lg border border-dashed border-otb-border bg-otb-page/80 px-4 py-4">
                    <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                      <ImagePlus className="h-8 w-8 text-otb-text/40" />
                      <span className="text-sm font-semibold text-otb-text">{t('marketplace.newListing.choosePhotos')}</span>
                      <input type="file" accept="image/*" multiple className="sr-only" onChange={onIssuePhotosChange} />
                    </label>
                    <p className="mt-2 text-center text-xs text-otb-text/55">{t('workshop.issuePhotosHint')}</p>
                    {photoPreviews.length > 0 && (
                      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {photoPreviews.map((src, i) => (
                          <li key={src} className="relative aspect-square overflow-hidden rounded-md border border-otb-border bg-otb-surface">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeIssuePhoto(i)}
                              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
                              aria-label="Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Date & Contact */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>{t('workshop.phone')} *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-otb-text/55" />
                    <input {...register('contactPhone')} type="tel" className={cn(inputCls, 'pl-10')} placeholder={t('workshop.placeholder.phone')} />
                  </div>
                  {errors.contactPhone && <p className={errCls}>{errors.contactPhone.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>{t('workshop.date')} *</label>
                  <input {...register('preferredDate')} type="date" min={new Date().toISOString().split('T')[0]}
                    className={cn(inputCls, '[color-scheme:dark]')} />
                  {errors.preferredDate && <p className={errCls}>{errors.preferredDate.message}</p>}
                </div>
              </div>
            )}

            {/* STEP 3: Review */}
            {step === 3 && (
              <div className="space-y-0">
                <h3 className="text-lg font-bold text-otb-text mb-4">{t('workshop.review.title')}</h3>
                <div className="divide-y divide-otb-border rounded-lg border border-otb-border overflow-hidden">
                  {[
                    [t('workshop.review.plate'), formValues.registrationPlate],
                    ...(formValues.model ? [[t('workshop.review.model'), formValues.model]] as const : []),
                    [t('workshop.review.issue'), t(`issue.${formValues.issueCategory}` as MessageKey)],
                    ...(formValues.customerMessage ? [[t('workshop.review.notes'), formValues.customerMessage]] as const : []),
                    ...(issuePhotos.length > 0 ? [[t('workshop.review.photos'), `${issuePhotos.length}`]] as const : []),
                    [t('workshop.review.phone'), formValues.contactPhone],
                    [t('workshop.review.date'), formValues.preferredDate],
                  ].map(([lbl, val]) => (
                    <div key={String(lbl)} className="flex items-start justify-between gap-4 bg-otb-surface px-4 py-3.5 sm:px-5">
                      <span className="text-otb-text text-sm font-medium shrink-0 w-[40%] sm:w-1/3">{lbl}</span>
                      <span className="text-otb-text text-sm text-right break-words font-medium flex-1">{val}</span>
                    </div>
                  ))}
                </div>
                {!isAuthenticated && (
                  <div className="mt-5 p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30">
                    <p className="text-[#f59e0b] text-sm font-semibold">
                      {t('workshop.signInPrompt')}{' '}
                      <Link href="/login" className="underline">{t('common.signIn')}</Link>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6 gap-3">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="inline-flex items-center gap-2 rounded-md border border-otb-border bg-otb-surface px-5 py-3 text-sm font-semibold text-otb-text shadow-sm transition-colors hover:bg-otb-page">
                <ArrowLeft className="h-4 w-4" /> {t('common.back')}
              </button>
            ) : <div />}

            {step < stepLabels.length - 1 ? (
              <button type="button" onClick={nextStep}
                className="inline-flex items-center gap-2 rounded-md bg-[#e51b23] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ff1f28]">
                {t('common.next')} <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-md bg-[#e51b23] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ff1f28] disabled:opacity-50">
                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('common.submitting')}</> : <><CheckCircle className="h-4 w-4" /> {t('workshop.submit')}</>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
