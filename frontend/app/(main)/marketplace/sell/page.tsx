'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, ImagePlus } from 'lucide-react';
import { bikes as bikesApi, brands as brandsApi } from '@/lib/api';
import type { Brand } from '@/lib/types';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { MessageKey } from '@/lib/messages';

const ENGINE_VALUES = ['TWO_STROKE', 'FOUR_STROKE', 'ELECTRIC'] as const;

const inputCls =
  'w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-otb-text shadow-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e51b23]/20 focus:border-[#e51b23]/45 transition-colors';
const labelCls = 'text-sm font-semibold text-otb-text block mb-2';
const errCls = 'text-[#e51b23] text-xs mt-1';

type FormValues = {
  brandId: string;
  model: string;
  year: string;
  engineType: (typeof ENGINE_VALUES)[number] | '';
  mileageKm: string;
  fuelConsumption: string;
  price: string;
  description: string;
  location: string;
  whatsappNumber: string;
  phoneNumber: string;
};

export default function MarketplaceSellPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);

  const yrMax = new Date().getFullYear() + 1;

  const schema = useMemo(
    () =>
      z.object({
        brandId: z.string().uuid(t('marketplace.newListing.validation.brand')),
        model: z.string().trim().min(1, t('marketplace.newListing.validation.model')).max(100),
        year: z
          .string()
          .min(1, t('marketplace.newListing.validation.year'))
          .refine((v) => {
            const y = Number(v);
            return Number.isInteger(y) && y >= 1950 && y <= yrMax;
          }, t('marketplace.newListing.validation.year')),
        engineType: z
          .string()
          .min(1, t('marketplace.newListing.validation.engine'))
          .refine(
            (v): v is (typeof ENGINE_VALUES)[number] => (ENGINE_VALUES as readonly string[]).includes(v),
            t('marketplace.newListing.validation.engine'),
          ),
        mileageKm: z
          .string()
          .min(1, t('marketplace.newListing.validation.mileage'))
          .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, t('marketplace.newListing.validation.mileage')),
        fuelConsumption: z.string().optional(),
        price: z
          .string()
          .min(1, t('marketplace.newListing.validation.price'))
          .refine((v) => {
            const n = Number(v);
            return Number.isFinite(n) && n > 0;
          }, t('marketplace.newListing.validation.price')),
        description: z
          .string()
          .trim()
          .min(10, t('marketplace.newListing.validation.description'))
          .max(5000),
        location: z.string().trim().min(2, t('marketplace.newListing.validation.location')).max(200),
        whatsappNumber: z.union([z.literal(''), z.string().min(7).max(20)]),
        phoneNumber: z.union([z.literal(''), z.string().min(7).max(20)]),
      }),
    [t, yrMax],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      brandId: '',
      model: '',
      year: '',
      engineType: '',
      mileageKm: '',
      fuelConsumption: '',
      price: '',
      description: '',
      location: '',
      whatsappNumber: '',
      phoneNumber: '',
    },
  });

  useEffect(() => {
    brandsApi.list().then((r) => setBrands(r.brands)).catch(() => {});
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      toast.error(t('marketplace.newListing.toast.signIn'));
      router.replace('/login?next=/marketplace/sell');
    }
  }, [authLoading, isAuthenticated, router, t]);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setPhotos(list.slice(0, 12));
  }

  async function onSubmit(data: FormValues) {
    const fuelRaw = data.fuelConsumption?.trim();
    let fuelConsumption: number | undefined;
    if (fuelRaw) {
      const n = parseFloat(fuelRaw.replace(',', '.'));
      if (Number.isFinite(n) && n >= 0) fuelConsumption = n;
    }

    const payload = {
      brandId: data.brandId,
      model: data.model.trim(),
      year: Number(data.year),
      engineType: data.engineType,
      mileageKm: Number(data.mileageKm),
      fuelConsumption,
      price: Number(data.price),
      description: data.description.trim(),
      location: data.location.trim(),
      whatsappNumber: data.whatsappNumber.trim() || undefined,
      phoneNumber: data.phoneNumber.trim() || undefined,
    };

    try {
      const { listing } = await bikesApi.create(payload as Record<string, unknown>);
      if (photos.length > 0) {
        try {
          await bikesApi.uploadPhotos(listing.id, photos);
        } catch (err) {
          const reason = err instanceof ApiClientError ? err.message : t('auth.error.generic');
          toast.warning(
            t('marketplace.newListing.toast.photosFailedReason', {
              base: t('marketplace.newListing.toast.photosFailed'),
              reason,
            }),
          );
        }
      }
      toast.success(t('marketplace.newListing.toast.created'));
      router.push('/dashboard?tab=listings');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('auth.error.generic'));
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e51b23]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-neutral-200/80 bg-white">
        <div className="section-container py-6 md:py-8">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-otb-text mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('marketplace.newListing.back')}
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="h-px w-8 bg-neutral-300" />
            <span className="text-neutral-600 text-xs font-medium">{t('marketplace.eyebrow')}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-otb-text tracking-tight leading-none">
            {t('marketplace.newListing.title')}
          </h1>
          <p className="mt-3 text-otb-text text-sm max-w-xl">{t('marketplace.newListing.sub')}</p>
        </div>
      </div>

      <div className="section-container py-8 max-w-2xl pb-16">
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>{t('marketplace.newListing.brand')} *</label>
              <select {...register('brandId')} className={inputCls}>
                <option value="">{t('marketplace.newListing.selectBrand')}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.brandId && <p className={errCls}>{errors.brandId.message}</p>}
            </div>

            <div>
              <label className={labelCls}>{t('marketplace.newListing.model')} *</label>
              <input {...register('model')} className={inputCls} placeholder="e.g. EXC 300" />
              {errors.model && <p className={errCls}>{errors.model.message}</p>}
            </div>

            <div>
              <label className={labelCls}>{t('marketplace.newListing.year')} *</label>
              <input {...register('year')} type="number" className={inputCls} min={1950} max={yrMax} />
              {errors.year && <p className={errCls}>{errors.year.message}</p>}
            </div>

            <div>
              <label className={labelCls}>{t('marketplace.newListing.engine')} *</label>
              <select {...register('engineType')} className={inputCls}>
                <option value="">{t('workshop.select.engine')}</option>
                {ENGINE_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {t(`engine.${v}` as MessageKey)}
                  </option>
                ))}
              </select>
              {errors.engineType && <p className={errCls}>{errors.engineType.message}</p>}
            </div>

            <div>
              <label className={labelCls}>{t('marketplace.newListing.mileage')} *</label>
              <input {...register('mileageKm')} type="number" min={0} className={inputCls} />
              {errors.mileageKm && <p className={errCls}>{errors.mileageKm.message}</p>}
            </div>

            <div>
              <label className={labelCls}>{t('marketplace.newListing.fuelOptional')}</label>
              <input {...register('fuelConsumption')} className={inputCls} placeholder="—" />
            </div>

            <div>
              <label className={labelCls}>{t('marketplace.newListing.price')} *</label>
              <input {...register('price')} type="number" min={0} step="0.01" className={inputCls} />
              {errors.price && <p className={errCls}>{errors.price.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>{t('marketplace.newListing.location')} *</label>
              <input {...register('location')} className={inputCls} />
              {errors.location && <p className={errCls}>{errors.location.message}</p>}
            </div>

            <div>
              <label className={labelCls}>{t('marketplace.newListing.whatsapp')}</label>
              <input {...register('whatsappNumber')} type="tel" className={inputCls} placeholder="+94 …" />
              {errors.whatsappNumber && <p className={errCls}>{errors.whatsappNumber.message}</p>}
            </div>

            <div>
              <label className={labelCls}>{t('marketplace.newListing.phone')}</label>
              <input {...register('phoneNumber')} type="tel" className={inputCls} placeholder="+94 …" />
              {errors.phoneNumber && <p className={errCls}>{errors.phoneNumber.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>{t('marketplace.newListing.description')} *</label>
              <textarea
                {...register('description')}
                rows={6}
                className={cn(inputCls, 'resize-y min-h-[120px]')}
                placeholder={t('workshop.placeholder.message')}
              />
              {errors.description && <p className={errCls}>{errors.description.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>{t('marketplace.newListing.photos')}</label>
              <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/80 px-4 py-6">
                <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                  <ImagePlus className="h-8 w-8 text-neutral-400" />
                  <span className="text-sm font-semibold text-otb-text">{t('marketplace.newListing.choosePhotos')}</span>
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={onPhotoChange} />
                </label>
                <p className="mt-3 text-center text-xs text-neutral-600">{t('marketplace.newListing.photosHint')}</p>
                {photos.length > 0 && (
                  <p className="mt-2 text-center text-sm font-medium text-otb-text">
                    {t('marketplace.newListing.nPhotos', { count: photos.length })}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#e51b23] hover:bg-[#c9161e] text-white font-semibold py-3.5 text-sm shadow-sm transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('marketplace.newListing.submitting')}
              </>
            ) : (
              t('marketplace.newListing.submit')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
