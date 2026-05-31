'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { shops as shopsApi, ApiClientError } from '@/lib/api';
import type { Shop } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';

type FormData = {
  name: string;
  slug: string;
  description?: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
};

const inputCls =
  'w-full rounded-md border border-otb-border bg-otb-surface px-4 py-3 text-sm text-otb-text shadow-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e51b23]/20 focus:border-[#e51b23]/45 transition-colors';

export default function ShopApplyPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [myShop, setMyShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2),
        slug: z
          .string()
          .min(2)
          .max(80)
          .regex(/^[a-z0-9-]+$/),
        description: z.string().max(2000).optional().or(z.literal('')),
        contactEmail: z.string().email(),
        contactPhone: z.string().min(7).max(20),
        address: z.string().max(400).optional().or(z.literal('')),
      }),
    [],
  );

  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      contactEmail: user?.email ?? '',
      contactPhone: user?.phone ?? '',
      address: '',
    },
  });

  useEffect(() => {
    if (user?.email) setValue('contactEmail', user.email);
    if (user?.phone) setValue('contactPhone', user.phone);
  }, [user?.email, user?.phone, setValue]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/shop/apply');
      return;
    }
    shopsApi.me()
      .then((r) => setMyShop(r.shop))
      .catch((e) => {
        if (!(e instanceof ApiClientError && e.status === 404)) {
          toast.error(t('shop.apply.toast.loadError'));
        }
        setMyShop(null);
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, router, t]);

  async function onSubmit(data: FormData) {
    try {
      const { shop } = await shopsApi.apply({
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address || undefined,
      });
      setMyShop(shop);
      toast.success(t('shop.apply.toast.submitted'));
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t('shop.apply.toast.error'));
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-otb-page race-stripes">
        <Loader2 className="h-8 w-8 animate-spin text-[#e51b23]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-otb-page race-stripes">
      <div className="bg-otb-surface border-b border-otb-border">
        <div className="section-container py-6 md:py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#e51b23] text-white">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-otb-text uppercase tracking-tight">
                {t('shop.apply.title')}
              </h1>
              <p className="text-otb-text/60 text-sm mt-1">{t('shop.apply.sub')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="section-container py-8 max-w-2xl">
        {myShop ? (
          <div className="border border-otb-border bg-otb-surface p-6 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-otb-text/45">{t('shop.apply.me')}</p>
            <p className="text-xl font-bold text-otb-text">{myShop.name}</p>
            <p className="text-sm text-otb-text/70">/{myShop.slug}</p>
            <p className="text-sm text-otb-text">{t('shop.apply.status')}: <strong>{myShop.status}</strong></p>
            <p className={cn('text-sm', myShop.status === 'APPROVED' ? 'text-emerald-600' : 'text-[#f59e0b]')}>
              {myShop.status === 'APPROVED' ? t('shop.apply.approvedHint') : t('shop.apply.pendingHint')}
            </p>
            {myShop.status === 'APPROVED' && (
              <Link href="/shop/dashboard" className="inline-flex mt-2 px-4 py-2 bg-[#e51b23] text-white text-sm font-semibold hover:bg-[#ff1f28] transition-colors">
                {t('nav.shopDashboard')}
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="border border-otb-border bg-otb-surface p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.apply.name')}</label>
              <input {...register('name')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.apply.slug')}</label>
              <input
                {...register('slug')}
                className={inputCls}
                onChange={(e) => setValue('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.apply.description')} ({t('common.optional')})</label>
              <textarea {...register('description')} rows={4} className={cn(inputCls, 'resize-none')} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.apply.contactEmail')}</label>
                <input {...register('contactEmail')} type="email" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.apply.contactPhone')}</label>
                <input {...register('contactPhone')} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.apply.address')} ({t('common.optional')})</label>
              <input {...register('address')} className={inputCls} />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {t('shop.apply.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

