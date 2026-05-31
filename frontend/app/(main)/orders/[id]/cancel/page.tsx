'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function OrderCancelPage() {
  const params = useParams();
  const { t } = useLanguage();
  const id = typeof params.id === 'string' ? params.id : '';

  return (
    <div className="min-h-screen bg-otb-page race-stripes flex items-center justify-center px-4">
      <div className="w-full max-w-xl border border-otb-border bg-otb-surface p-7 sm:p-9 text-center">
        <XCircle className="h-14 w-14 mx-auto text-[#e51b23]" />
        <h1 className="mt-4 font-display text-3xl font-black text-otb-text uppercase tracking-tight">
          {t('order.cancel.title')}
        </h1>
        <p className="mt-3 text-sm text-otb-text/70">{t('order.cancel.sub')}</p>
        {id && <p className="mt-4 text-xs text-otb-text/45 font-mono">Order: {id}</p>}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/parts?cart=1" className="px-5 py-3 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-sm font-semibold transition-colors">
            {t('order.cancel.retry')}
          </Link>
          <Link href="/dashboard?tab=orders" className="px-5 py-3 border border-otb-border text-otb-text text-sm font-semibold hover:border-otb-text/40 transition-colors">
            {t('order.cancel.myOrders')}
          </Link>
        </div>
      </div>
    </div>
  );
}

