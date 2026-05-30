'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Wrench,
  Bike,
  ShoppingBag,
  Zap,
  Package,
  CreditCard,
  MessageSquare,
  Languages,
  Settings,
  Sliders,
  Link2,
  RotateCcw,
  CheckCircle,
  Phone,
  TrendingUp,
  Star,
  UserPlus,
} from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { MessageKey } from '@/lib/messages';
import { cn } from '@/lib/utils';

// ─── Photos ───────────────────────────────────────────────────────────────────
const PHOTO = {
  hero:     'https://powersports.honda.com/motorcycle/-/media/products/family/crf450x/hero-banner/desktop/2026/2026-crf450x-hero-desktop.jpg',
  workshop: 'https://powersports.honda.com/-/media/feature/powersports/globals/header/2026-experience-honda-nav.jpg',
  market:   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&auto=format&fit=crop&q=80',
  parts:    'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=700&auto=format&fit=crop&q=80',
  service:  'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&auto=format&fit=crop&q=80',
  bikes:    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=700&auto=format&fit=crop&q=80',
  gear:     'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=700&auto=format&fit=crop&q=80',
};

const BRANDS = ['KTM', 'Husqvarna', 'Beta', 'Sherco', 'GasGas', 'Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'TM Racing'];

const WORKSHOP_SERVICE_ICONS = [Settings, Settings, Sliders, CheckCircle, Zap, Link2, RotateCcw, Wrench] as const;

const FEATURE_ROWS = [
  { num: '01', Icon: ShieldCheck,   titleKey: 'home.features.1.title' as const, descKey: 'home.features.1.desc' as const },
  { num: '02', Icon: Languages,     titleKey: 'home.features.2.title' as const, descKey: 'home.features.2.desc' as const },
  { num: '03', Icon: MessageSquare, titleKey: 'home.features.3.title' as const, descKey: 'home.features.3.desc' as const },
  { num: '04', Icon: Wrench,        titleKey: 'home.features.4.title' as const, descKey: 'home.features.4.desc' as const },
  { num: '05', Icon: Package,       titleKey: 'home.features.5.title' as const, descKey: 'home.features.5.desc' as const },
  { num: '06', Icon: CreditCard,    titleKey: 'home.features.6.title' as const, descKey: 'home.features.6.desc' as const },
];

const HERO_STATS = [
  { Icon: TrendingUp, val: '500+',   lblKey: 'home.hero.stat.members' as const },
  { Icon: Wrench,     val: '1,200+', lblKey: 'home.hero.stat.services' as const },
  { Icon: Bike,       val: '350+',   lblKey: 'home.hero.stat.sold' as const },
  { Icon: Star,       val: '4.9',    lblKey: 'home.hero.stat.rating' as const },
];

/** Bottom hero action row — OEM-style shortcuts */
const HERO_QUICK = [
  { href: '/workshop', labelKey: 'home.quick.workshop' as const, Icon: Wrench },
  { href: '/marketplace', labelKey: 'home.quick.marketplace' as const, Icon: Bike },
  { href: '/parts', labelKey: 'home.quick.parts' as const, Icon: ShoppingBag },
  { href: '/register', labelKey: 'home.quick.join' as const, Icon: UserPlus },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col bg-[#f4f4f5] dark:bg-otb-page">

      {/* ════════════════════════════════════════════════════════════════════
          01  HERO — full-bleed image, clean overlay (OEM-style)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[min(88dvh,820px)] sm:min-h-[min(92vh,880px)] flex-col pt-[env(safe-area-inset-top,0px)]">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center sm:bg-[center_35%]"
            style={{
              backgroundImage: `url('${PHOTO.hero}')`,
              backgroundPosition: 'center center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/60 to-black/35 md:via-black/55 md:to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/25 md:from-black/35 md:via-transparent" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-16 lg:px-8">
          <div className="section-container max-w-3xl">
            <p className="text-white/85 text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] sm:tracking-[0.28em]">
              {t('home.hero.headline')}
            </p>
            <h1 className="font-display mt-3 sm:mt-4 uppercase tracking-tight text-white">
              <span className="block font-black leading-[0.95]" style={{ fontSize: 'clamp(1.875rem, 6.5vw, 4rem)' }}>
                {t('home.hero.word1')} {t('home.hero.word2')}
              </span>
              <span
                className="mt-1 block font-black leading-[0.95] text-[#e51b23]"
                style={{ fontSize: 'clamp(1.875rem, 6.5vw, 4rem)' }}
              >
                {t('home.hero.word3')}
              </span>
            </h1>
            <p className="mt-5 sm:mt-6 max-w-lg text-[15px] sm:text-base leading-relaxed text-white/80">
              {t('home.hero.sub')}
            </p>
            <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:flex-wrap">
              <Link
                href="/workshop"
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#e51b23] px-6 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-black/25 transition-colors hover:bg-[#ff1f28] active:bg-[#d41720] sm:inline-flex sm:w-auto sm:flex-none sm:min-h-0 sm:px-7 touch-manipulation"
              >
                <Phone className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
                {t('home.hero.cta.bookAlt')}
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg border border-white/35 bg-white/10 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm transition-colors hover:bg-white/20 active:bg-white/25 sm:inline-flex sm:w-auto sm:flex-none sm:min-h-0 sm:px-7 touch-manipulation"
              >
                {t('home.hero.cta.browseBikes')}
                <ArrowRight className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-6 border-t border-white/15 pt-8 sm:grid-cols-4 sm:gap-8">
              {HERO_STATS.map(({ Icon, val, lblKey }) => (
                <div key={lblKey} className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-white/50" />
                    <span className="text-lg font-black tabular-nums text-white sm:text-xl md:text-2xl">{val}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] font-medium uppercase leading-snug tracking-[0.1em] text-white/50 sm:text-[11px] sm:tracking-[0.12em]">
                    {t(lblKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick links bar — white segmented row */}
        <div className="relative z-10 mt-auto border-t border-otb-border bg-otb-surface pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_32px_rgba(0,0,0,0.06)]">
          <div className="section-container grid grid-cols-2 md:grid-cols-4">
            {HERO_QUICK.map(({ href, labelKey, Icon }, i) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-h-[52px] items-center justify-center gap-2 border-otb-border px-2 py-3 text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.1em] transition-colors active:bg-black/[0.04] sm:min-h-0 sm:py-4 sm:text-xs sm:tracking-[0.14em] md:py-5 touch-manipulation',
                  i > 0 && 'border-t md:border-t-0 md:border-l',
                  i === 3
                    ? 'bg-[#e51b23] text-white hover:bg-[#ff1f28]'
                    : 'bg-otb-surface text-[#e51b23] hover:bg-otb-page',
                )}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-90 sm:h-4 sm:w-4" />
                <span className="max-w-[9rem] leading-tight sm:max-w-none">{t(labelKey)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          02  METRICS — quiet strip
      ════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-otb-border bg-otb-elevated/60 py-8 md:py-6">
        <div className="section-container grid grid-cols-2 gap-x-6 gap-y-6 md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-12 md:gap-y-4">
          {[
            [t('home.strip.val1'), t('home.strip.lbl1')],
            [t('home.strip.val2'), t('home.strip.lbl2')],
            [t('home.strip.val3'), t('home.strip.lbl3')],
            [t('home.strip.val4'), t('home.strip.lbl4')],
          ].map(([val, lbl]) => (
            <div key={lbl} className="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-3 sm:text-left">
              <span className="text-xl font-black tabular-nums text-otb-text sm:text-2xl">{val}</span>
              <span className="max-w-[10rem] text-[10px] font-medium uppercase leading-snug tracking-[0.12em] text-otb-text/80 sm:max-w-[7rem]">
                {lbl}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          03  THREE SERVICE CARDS — clean product-style tiles
      ════════════════════════════════════════════════════════════════════ */}
      <section className="border-b border-otb-border py-10 md:py-20">
        <div className="section-container grid gap-5 sm:gap-6 md:grid-cols-3 md:gap-8">
          {[
            { labelKey: 'home.card.workshop.label' as const, subKey: 'home.card.workshop.sub' as const, href: '/workshop', photo: PHOTO.workshop, accent: '#e51b23' },
            { labelKey: 'home.card.market.label' as const, subKey: 'home.card.market.sub' as const, href: '/marketplace', photo: PHOTO.market, accent: '#f59e0b' },
            { labelKey: 'home.card.parts.label' as const, subKey: 'home.card.parts.sub' as const, href: '/parts', photo: PHOTO.parts, accent: '#16a34a' },
          ].map(({ labelKey, subKey, href, photo, accent }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col overflow-hidden rounded-xl border border-otb-border bg-otb-surface shadow-sm transition-shadow hover:shadow-md active:scale-[0.99] sm:rounded-2xl touch-manipulation"
            >
              <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[16/11]">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url('${photo}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              </div>
              <div className="flex flex-1 flex-col p-5 md:p-7">
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] sm:text-[11px] sm:tracking-[0.2em]" style={{ color: accent }}>
                  {t(subKey)}
                </span>
                <h3 className="mt-2 text-xl font-bold uppercase leading-tight tracking-tight text-otb-text sm:text-2xl md:text-[1.65rem]">
                  {t(labelKey)}
                </h3>
                <span
                  className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors"
                  style={{ color: accent }}
                >
                  {t('common.explore')} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          04  WORKSHOP SERVICES — dark, numbered grid, race stripes
      ════════════════════════════════════════════════════════════════════ */}
      <section className="border-b border-otb-border bg-otb-surface py-12 md:py-24">
        <div className="section-container">
          {/* Header */}
          <div className="flex flex-col gap-5 mb-10 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <span className="h-px w-10 bg-[#e51b23]" />
                <span className="text-[#e51b23] text-[11px] font-medium tracking-[0.25em] uppercase sm:text-xs sm:tracking-[0.3em]">{t('home.services.eyebrow')}</span>
              </div>
              <h2 className="font-display text-[clamp(1.75rem,8vw,3.75rem)] md:text-6xl font-black text-otb-text uppercase leading-[1.05] tracking-tight">
                {t('home.services.title1')}<br />{t('home.services.title2')}
              </h2>
            </div>
            <Link href="/workshop"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors shrink-0 sm:w-auto md:self-end touch-manipulation">
              {t('common.bookNow')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Service grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4 lg:gap-5">
            {WORKSHOP_SERVICE_ICONS.map((Icon, i) => (
              <div
                key={i}
                className="group rounded-lg border border-otb-border bg-otb-page p-4 transition-colors sm:rounded-xl sm:p-5 hover:border-otb-text/15 hover:bg-white dark:hover:bg-otb-elevated"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f59e0b]/10 mb-3 sm:h-10 sm:w-10 sm:mb-4">
                  <Icon className="h-[18px] w-[18px] text-[#f59e0b] sm:h-5 sm:w-5" />
                </div>
                <p className="text-[11px] font-semibold uppercase leading-snug tracking-tight text-otb-text sm:text-sm">
                  {t(`home.workshop.service.${i + 1}` as MessageKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          05  FEATURES — dark, numbered list, 3-col
      ════════════════════════════════════════════════════════════════════ */}
      <section className="border-b border-otb-border bg-[#f4f4f5] py-12 md:py-24 dark:bg-otb-page">
        <div className="section-container">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <span className="h-px w-10 bg-[#f59e0b]" />
            <span className="text-[#f59e0b] text-[11px] font-medium tracking-[0.25em] uppercase sm:text-xs sm:tracking-[0.3em]">{t('home.features.eyebrow')}</span>
          </div>
          <h2 className="font-display text-[clamp(1.65rem,7vw,3rem)] md:text-5xl font-black text-otb-text uppercase leading-[1.05] tracking-tight mb-8 sm:mb-12">
            {t('home.features.title')}
          </h2>

          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_ROWS.map(({ num, Icon, titleKey, descKey }) => (
              <div
                key={titleKey}
                className="rounded-xl border border-otb-border bg-otb-surface p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-semibold tabular-nums text-[#e51b23]">{num}</span>
                  <span className="h-px flex-1 bg-otb-border" />
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f59e0b]/10 mb-4">
                  <Icon className="h-5 w-5 text-[#f59e0b]" />
                </div>
                <h3 className="text-lg font-bold uppercase tracking-tight text-otb-text sm:text-xl">{t(titleKey)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-otb-text/85">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          06  FULL-BLEED SERVICES SECTION — bike photo right
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-b border-otb-border bg-otb-surface">
        {/* Mobile / tablet: full-bleed image banner so verified isn’t text-only */}
        <div
          className="relative aspect-[21/9] min-h-[160px] w-full bg-cover bg-center md:hidden"
          style={{ backgroundImage: `url('${PHOTO.service}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-otb-surface via-otb-surface/40 to-black/30" />
        </div>
        <div className="section-container">
          <div className="grid items-stretch md:grid-cols-2 md:min-h-[500px]">
            {/* Text */}
            <div className="relative z-10 py-10 md:py-24 md:pr-16">
              <div className="flex items-center gap-3 mb-4 md:mb-5">
                <span className="h-px w-10 bg-[#e51b23]" />
                <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#e51b23] sm:text-xs sm:tracking-[0.3em]">{t('marketplace.verified')}</span>
              </div>
              <h2 className="font-display text-[clamp(1.65rem,6vw,3rem)] font-black uppercase leading-[1.05] tracking-tight text-otb-text md:text-5xl">
                {t('home.verified.title')}
              </h2>
              <div className="mt-4 h-1 w-16 bg-[#f59e0b] mb-5 md:mb-6" />
              <p className="max-w-sm text-sm leading-relaxed text-otb-text/90">
                {t('home.verified.desc')}
              </p>

              <div className="mt-6 space-y-2.5 md:mt-7 md:space-y-3">
                {(['home.verified.bullet1', 'home.verified.bullet2', 'home.verified.bullet3', 'home.verified.bullet4'] as const).map((k) => (
                  <div key={k} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-[#e51b23]">
                      <CheckCircle className="h-3 w-3 text-otb-text" />
                    </div>
                    <span className="text-sm text-otb-text">{t(k)}</span>
                  </div>
                ))}
              </div>

              <Link href="/marketplace?verified=true"
                className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-[#111827] transition-colors bg-[#f59e0b] hover:bg-[#e08e00] sm:w-auto touch-manipulation">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {t('home.verified.cta')}
              </Link>
            </div>

            {/* Desktop photo */}
            <div
              className="relative hidden min-h-[280px] md:block"
              style={{ backgroundImage: `url('${PHOTO.service}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#111827] to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/50 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          07  TWO PRODUCT CARDS — side by side
      ════════════════════════════════════════════════════════════════════ */}
      <section className="border-b border-otb-border bg-[#f4f4f5] py-10 md:py-16 dark:bg-otb-page">
        <div className="section-container grid gap-5 sm:gap-6 md:grid-cols-2 md:gap-8">
          {[
            { titleKey: 'home.product.bikesTitle' as const, subKey: 'home.product.bikesSub' as const, href: '/marketplace', photo: PHOTO.bikes, Icon: Bike, accent: '#e51b23' },
            { titleKey: 'home.product.partsTitle' as const, subKey: 'home.product.partsSub' as const, href: '/parts', photo: PHOTO.gear, Icon: ShoppingBag, accent: '#f59e0b' },
          ].map(({ titleKey, subKey, href, photo, Icon, accent }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-[260px] flex-col overflow-hidden rounded-xl border border-otb-border bg-otb-surface shadow-sm transition-shadow hover:shadow-md active:scale-[0.995] sm:min-h-[280px] sm:rounded-2xl md:min-h-[320px] touch-manipulation"
            >
              <div className="relative min-h-[140px] flex-1 overflow-hidden sm:min-h-[160px]">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-90 transition-opacity group-hover:opacity-100"
                  style={{ backgroundImage: `url('${photo}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-otb-surface via-otb-surface/70 to-transparent" />
              </div>
              <div className="relative z-10 -mt-12 px-5 pb-6 pt-2 sm:-mt-14 sm:px-8 sm:pb-8 sm:pt-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg sm:mb-4 sm:h-11 sm:w-11" style={{ backgroundColor: `${accent}18` }}>
                  <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" style={{ color: accent }} />
                </div>
                <h3 className="text-xl font-bold uppercase leading-tight tracking-tight text-otb-text whitespace-pre-line sm:text-2xl md:text-3xl">
                  {t(titleKey)}
                </h3>
                <p className="mt-2 text-sm text-otb-text/85">{t(subKey)}</p>
                <div
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 py-1 text-xs font-semibold uppercase tracking-wider transition-colors group-hover:gap-3 sm:mt-5"
                  style={{ color: accent }}
                >
                  {t('common.shopNow')} <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          08  BRANDS STRIP
      ════════════════════════════════════════════════════════════════════ */}
      <div className="overflow-hidden border-y border-otb-border bg-otb-surface py-4 md:py-5">
        <div className="section-container">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-8 sm:gap-y-2">
            <span className="shrink-0 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-otb-text/70 sm:mr-4 sm:text-left">
              {t('home.brands.serviceLabel')}
            </span>
            <div className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
              {BRANDS.map((b) => (
                <span
                  key={b}
                  className="shrink-0 snap-start text-sm font-medium tracking-wide text-otb-text/75 transition-colors select-none first:pl-1 last:pr-1 sm:first:pl-0 sm:last:pr-0"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          09  CTA — full red, massive type
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#e51b23] py-12 md:py-24">
        <div className="section-container relative z-10">
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10">
            <div className="min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/80 sm:text-xs sm:tracking-[0.3em]">{t('home.cta.eyebrow')}</span>
              <h2 className="font-display mt-2 text-[clamp(2rem,10vw,4.5rem)] font-black uppercase leading-[0.98] tracking-tight text-white md:text-7xl">
                {t('home.cta.title')}
              </h2>
              <div className="mt-4 h-1 w-20 bg-white/30 mb-4 md:mb-5" />
              <p className="max-w-sm text-[15px] leading-relaxed text-white/85 md:text-base">{t('home.cta.sub')}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row md:justify-end">
              <Link href="/register"
                className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#e51b23] transition-colors bg-white hover:bg-white/90 sm:flex-none sm:px-10 touch-manipulation">
                {t('home.cta.button')} <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
              <Link href="/marketplace"
                className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 border-2 border-white/40 px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-white sm:flex-none touch-manipulation">
                <Bike className="h-4 w-4 shrink-0" /> {t('home.cta.browseBikes')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          10  QUOTE — dark, big orange quote mark
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-otb-border bg-otb-page">
        <div className="section-container">
          <div className="grid items-center md:min-h-[280px] md:grid-cols-2">
            <div className="py-10 sm:py-14 md:py-20 md:pr-16">
              <div className="mb-3 text-7xl font-black leading-none text-[#f59e0b] opacity-60 select-none sm:mb-4 sm:text-8xl md:text-9xl">
                &ldquo;
              </div>
              <blockquote className="text-[clamp(1.125rem,4.5vw,1.875rem)] font-bold uppercase italic leading-snug tracking-tight text-otb-text md:text-3xl">
                {t('home.quote.text')}
              </blockquote>
              <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-otb-text/70 sm:mt-5 sm:text-xs sm:tracking-[0.2em]">
                {t('home.quote.byline')}
              </p>
            </div>
            <div
              className="relative hidden min-h-[200px] md:block md:min-h-[280px]"
              style={{ backgroundImage: `url('${PHOTO.hero}')`, backgroundSize: 'cover', backgroundPosition: '70% center' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-otb-page to-transparent" />
            </div>
            {/* Mobile: compact hero strip so quote section isn’t flat */}
            <div
              className="aspect-[2.4/1] w-full bg-cover bg-[center_40%] md:hidden"
              style={{ backgroundImage: `url('${PHOTO.hero}')` }}
            >
              <div className="h-full w-full bg-gradient-to-t from-otb-page via-otb-page/50 to-transparent" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
