'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-otb-page race-stripes">
      <div className="h-[3px] bg-[#e51b23] w-full" />

      <header className="border-b border-otb-border px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 w-fit group">
          <span className="flex h-7 w-7 items-center justify-center bg-[#e51b23] text-white font-bold text-[11px]">
            OTB
          </span>
          <span className="font-bold uppercase tracking-tight text-otb-text text-sm">
            OldTrailBikes
          </span>
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12 md:py-20">
        {children}
      </div>

      <div className="border-t border-otb-border py-4">
        <p className="text-center text-otb-text/20 text-[10px] font-bold uppercase tracking-[0.3em]">
          {t('auth.layout.tagline')}
        </p>
      </div>
    </div>
  );
}
