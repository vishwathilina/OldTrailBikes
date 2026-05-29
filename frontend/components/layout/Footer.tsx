'use client';

import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-otb-page border-t border-otb-border text-otb-text race-stripes">
      <div className="section-container py-14 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <span className="flex h-8 w-8 items-center justify-center bg-[#e51b23] text-white font-black text-xs">
                OTB
              </span>
              <span className="font-bold uppercase tracking-tight text-base">OldTrailBikes</span>
            </Link>
            <p className="text-sm text-otb-text/40 leading-relaxed">
              {t('footer.tagline')}
            </p>
            <div className="mt-5 space-y-2.5">
              <a href="mailto:info@oldtrailbikes.lk" className="flex items-center gap-2 text-xs text-otb-text/40 hover:text-otb-text/80 transition-colors">
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#e51b23]" />
                info@oldtrailbikes.lk
              </a>
              <a href="tel:+94771234567" className="flex items-center gap-2 text-xs text-otb-text/40 hover:text-otb-text/80 transition-colors">
                <Phone className="h-3.5 w-3.5 shrink-0 text-[#e51b23]" />
                +94 77 123 4567
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-otb-text/30 mb-4">{t('footer.col.marketplace')}</h3>
            <ul className="space-y-2.5">
              {[
                [t('footer.link.browseListings'), '/marketplace'],
                [t('footer.link.sellBike'), '/marketplace/sell'],
                [t('footer.link.verifiedBikes'), '/marketplace?verified=true'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-otb-text/50 hover:text-otb-text transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-otb-text/30 mb-4">{t('footer.col.workshop')}</h3>
            <ul className="space-y-2.5">
              {[
                [t('footer.link.bookService'), '/workshop'],
                [t('footer.link.myAppointments'), '/dashboard'],
                [t('footer.link.howItWorks'), '/workshop#how-it-works'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-otb-text/50 hover:text-otb-text transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-otb-text/30 mb-4">{t('footer.col.parts')}</h3>
            <ul className="space-y-2.5">
              {[
                [t('footer.link.browseParts'), '/parts'],
                [t('footer.link.shoppingCart'), '/parts/cart'],
                [t('footer.link.myOrders'), '/dashboard?tab=orders'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-otb-text/50 hover:text-otb-text transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-otb-text/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-otb-text/30">{t('footer.copyright', { year })}</p>
          <div className="flex items-center gap-5 text-[11px] text-otb-text/30">
            <Link href="/privacy" className="hover:text-otb-text/60 transition-colors">{t('footer.privacy')}</Link>
            <Link href="/terms" className="hover:text-otb-text/60 transition-colors">{t('footer.terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
