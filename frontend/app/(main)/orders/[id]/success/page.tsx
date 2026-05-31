'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function OrderSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const id = typeof params.id === 'string' ? params.id : '';
  const payhereOrderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen bg-otb-page race-stripes flex items-center justify-center px-4">
      <div className="w-full max-w-xl border border-otb-border bg-otb-surface p-7 sm:p-9 text-center">
        <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500" />
        <h1 className="mt-4 font-display text-3xl font-black text-otb-text uppercase tracking-tight">
          {t('order.success.title')}
        </h1>
        <p className="mt-3 text-sm text-otb-text/70">{t('order.success.sub')}</p>
        {id && <p className="mt-4 text-xs text-otb-text/45 font-mono">Order: {id}</p>}
        {payhereOrderId && <p className="mt-1 text-xs text-otb-text/45 font-mono">PayHere: {payhereOrderId}</p>}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard?tab=orders" className="px-5 py-3 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-sm font-semibold transition-colors">
            {t('order.success.myOrders')}
          </Link>
          <Link href="/parts" className="px-5 py-3 border border-otb-border text-otb-text text-sm font-semibold hover:border-otb-text/40 transition-colors">
            {t('order.success.continue')}
          </Link>
        </div>
      </div>
    </div>
  );
}

