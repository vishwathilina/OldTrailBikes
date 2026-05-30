'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Calendar, ShoppingBag, Bike, Package,
  ArrowRight, Clock, CheckCircle, Wrench, Loader2, Plus,
} from 'lucide-react';
import { appointments as apptApi, orders as ordersApi, bikes as bikesApi } from '@/lib/api';
import type { Appointment, Order, BikeForSale } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MessageKey } from '@/lib/messages';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  PENDING:           { bg: 'bg-[#f59e0b]/15',  text: 'text-[#f59e0b]'  },
  INSPECTED:         { bg: 'bg-blue-500/15',    text: 'text-blue-400'   },
  WAITING_FOR_PARTS: { bg: 'bg-orange-500/15',  text: 'text-orange-400' },
  REPAIRED:          { bg: 'bg-green-500/15',   text: 'text-green-400'  },
  AVAILABLE:         { bg: 'bg-green-500/15',   text: 'text-green-400'  },
  SOLD:              { bg: 'bg-white/10',       text: 'text-otb-text'   },
  PAID:              { bg: 'bg-green-500/15',   text: 'text-green-400'  },
  FAILED:            { bg: 'bg-[#e51b23]/15',   text: 'text-[#e51b23]' },
  REFUNDED:          { bg: 'bg-white/10',       text: 'text-otb-text'   },
  FULFILLED:         { bg: 'bg-green-500/15',   text: 'text-green-400'  },
  CANCELLED:         { bg: 'bg-white/10',       text: 'text-otb-text'   },
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  PENDING: Clock, INSPECTED: CheckCircle,
  WAITING_FOR_PARTS: Package, REPAIRED: CheckCircle,
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const s = STATUS_STYLE[status] ?? { bg: 'bg-white/10', text: 'text-otb-text' };
  const Icon = STATUS_ICONS[status] ?? Clock;
  const label = t(`status.${status}` as MessageKey);
  return (
    <span className={cn('flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shrink-0', s.bg, s.text)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function ApptRow({ appt }: { appt: Appointment }) {
  const { t, locale } = useLanguage();
  const issueLabel = t(`issue.${appt.issueCategory}` as MessageKey);
  return (
    <Link href={`/appointments/${appt.id}`}
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-otb-surface border border-otb-border p-4 hover:border-[#e51b23]/40 hover:bg-otb-elevated transition-all">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#e51b23] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#e51b23]/10">
          <Wrench className="h-5 w-5 text-[#e51b23]" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-otb-text uppercase tracking-tight text-sm truncate">
            {appt.serviceBike.registrationPlate}
            {appt.serviceBike.brand && ` · ${appt.serviceBike.brand.name}`}
            {appt.serviceBike.model && ` ${appt.serviceBike.model}`}
          </p>
          <p className="text-[11px] text-otb-text/75 mt-0.5 truncate">
            {issueLabel} &middot; {new Date(appt.preferredDate).toLocaleDateString(locale)}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
        {appt.estimatedCost && (
          <span className="text-[#f59e0b] font-bold text-sm">{t('common.lkr')} {Number(appt.estimatedCost).toLocaleString()}</span>
        )}
        <StatusBadge status={appt.status} />
      </div>
    </Link>
  );
}

function OrderRow({ order }: { order: Order }) {
  const { t, locale } = useLanguage();
  const itemsLabel = order.items.length === 1 ? t('dashboard.itemsCountOne') : t('dashboard.itemsCount', { count: order.items.length });
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-otb-surface border border-otb-border p-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#f59e0b]/10">
          <ShoppingBag className="h-5 w-5 text-[#f59e0b]" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-otb-text uppercase tracking-tight text-sm">
            {t('dashboard.orderLabel', { id: order.id.slice(0, 8).toUpperCase() })}
          </p>
          <p className="text-[11px] text-otb-text/75 mt-0.5 truncate">
            {new Date(order.placedAt).toLocaleDateString(locale)} &middot; {itemsLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
        <span className="font-bold text-otb-text text-sm">{t('common.lkr')} {Number(order.total).toLocaleString()}</span>
        <StatusBadge status={order.status} />
      </div>
    </div>
  );
}

function ListingRow({ bike }: { bike: BikeForSale }) {
  const { t } = useLanguage();
  return (
    <Link href={`/marketplace/${bike.id}`}
      className="group flex items-center gap-4 bg-otb-surface border border-otb-border p-4 hover:border-[#f59e0b]/40 transition-all overflow-hidden">
      <div className="h-14 w-14 shrink-0 bg-otb-elevated overflow-hidden">
        {bike.photos[0]
          ? <img src={bike.photos[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          : <div className="w-full h-full flex items-center justify-center"><Bike className="h-6 w-6 text-otb-text/20" /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-otb-text uppercase tracking-tight text-sm truncate">
          {bike.brand?.name} {bike.model} {bike.year ? `(${bike.year})` : ''}
        </p>
        <p className="text-[#f59e0b] font-bold text-xs mt-0.5">{t('common.lkr')} {Number(bike.price).toLocaleString()}</p>
      </div>
      <StatusBadge status={bike.status} />
    </Link>
  );
}

function EmptyState({ icon: Icon, message, href, cta }: { icon: React.ElementType; message: string; href: string; cta: string }) {
  return (
    <div className="border border-dashed border-otb-border py-14 flex flex-col items-center text-center bg-otb-page">
      <Icon className="h-10 w-10 text-otb-text/15 mb-4" />
      <p className="text-otb-text text-sm">{message}</p>
      <Link href={href}
        className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function RowSkeleton() {
  return <Skeleton className="h-[66px] w-full bg-otb-surface" />;
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'appointments', labelKey: 'dashboard.appointments' as const, Icon: Wrench },
  { id: 'orders',       labelKey: 'dashboard.orders'       as const, Icon: ShoppingBag },
  { id: 'listings',     labelKey: 'dashboard.listings'     as const, Icon: Bike },
] as const;

// ─── Inner page (needs Suspense for useSearchParams) ─────────────────────────
function DashboardInner() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const firstName = user?.fullName.split(' ')[0] ?? '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') ?? 'appointments');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [listings, setListings] = useState<BikeForSale[]>([]);
  const [loading, setLoading] = useState({ appointments: true, orders: true, listings: true });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }

    apptApi.mine({ pageSize: 20 }).then((r) => {
      setAppointments(r.items ?? []);
      setLoading((l) => ({ ...l, appointments: false }));
    }).catch(() => { toast.error(t('dashboard.toast.appointmentsError')); setLoading((l) => ({ ...l, appointments: false })); });

    ordersApi.mine({ pageSize: 20 }).then((r) => {
      setOrdersList(r.items ?? []);
      setLoading((l) => ({ ...l, orders: false }));
    }).catch(() => { setLoading((l) => ({ ...l, orders: false })); });

    bikesApi.list({ sellerId: user?.id, page: 1, pageSize: 20 }).then((r) => {
      setListings(r.items ?? []);
      setLoading((l) => ({ ...l, listings: false }));
    }).catch(() => { setLoading((l) => ({ ...l, listings: false })); });
  }, [isAuthenticated, authLoading, router, user?.id, t]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-otb-page race-stripes flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e51b23]" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const counts = [appointments.length, ordersList.length, listings.length];

  return (
    <div className="min-h-screen bg-otb-page race-stripes">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="bg-otb-surface border-b border-otb-border">
        <div className="section-container py-6 md:py-8 relative overflow-hidden">
          <span aria-hidden className="absolute -right-4 top-0 text-[120px] font-black text-otb-text/[0.04] leading-none select-none uppercase">
            {t('dashboard.ghostTitle')}
          </span>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <span className="h-px w-8 bg-[#e51b23]" />
            <span className="text-[#e51b23] text-[10px] font-medium tracking-[0.3em] uppercase">{t('dashboard.myAccount')}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-otb-text uppercase tracking-tight relative z-10">
            {t('dashboard.title')}
          </h1>
          <p className="text-otb-text text-sm mt-1 relative z-10">
            {t('dashboard.welcome', { name: firstName })}
          </p>
        </div>
      </div>

      {/* ── Stat Strip ────────────────────────────────────────────────────── */}
      <div className="bg-[#e51b23]">
        <div className="section-container py-0">
          <div className="grid grid-cols-3 divide-x divide-white/20">
            {TABS.map(({ id, labelKey, Icon }, i) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-4 px-4 text-left hover:bg-otb-text/10 transition-colors">
                <span className="text-2xl sm:text-3xl font-black text-otb-text">{counts[i]}</span>
                <div>
                  <p className="text-[10px] font-medium text-otb-text uppercase tracking-[0.15em] hidden sm:block">{t(labelKey)}</p>
                  <Icon className="h-4 w-4 text-otb-text sm:hidden" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="section-container py-6 md:py-10">

        {/* Tab nav */}
        <div className="flex gap-px bg-otb-text/[0.06] mb-6 overflow-x-auto">
          {TABS.map(({ id, labelKey, Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] whitespace-nowrap transition-colors flex-1 justify-center',
                activeTab === id
                  ? 'bg-[#e51b23] text-white'
                  : 'bg-otb-surface text-otb-text hover:bg-otb-elevated',
              )}>
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Appointments tab */}
        {activeTab === 'appointments' && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <span className="text-otb-text text-[10px] font-medium uppercase tracking-[0.25em]">{t('dashboard.section.workshop')}</span>
                <h2 className="text-xl font-bold text-otb-text uppercase">{t('dashboard.appointments')}</h2>
              </div>
              <Link href="/workshop"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-xs font-bold uppercase tracking-[0.15em] transition-colors">
                <Plus className="h-3.5 w-3.5" /> {t('dashboard.bookService')}
              </Link>
            </div>
            {loading.appointments
              ? <div className="space-y-px">{[1,2,3].map(i => <RowSkeleton key={i} />)}</div>
              : appointments.length === 0
                ? <EmptyState icon={Calendar} message={t('dashboard.noAppointments')} href="/workshop" cta={t('dashboard.empty.bookService')} />
                : <div className="space-y-px relative">{appointments.map(a => <ApptRow key={a.id} appt={a} />)}</div>
            }
          </div>
        )}

        {/* Orders tab */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <span className="text-otb-text text-[10px] font-medium uppercase tracking-[0.25em]">{t('dashboard.section.parts')}</span>
                <h2 className="text-xl font-bold text-otb-text uppercase">{t('dashboard.orders')}</h2>
              </div>
              <Link href="/parts"
                className="flex items-center gap-2 px-4 py-2.5 border border-otb-text/20 hover:border-[#f59e0b] text-otb-text hover:text-[#f59e0b] text-xs font-bold uppercase tracking-[0.15em] transition-colors">
                {t('dashboard.browseParts')} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {loading.orders
              ? <div className="space-y-px">{[1,2,3].map(i => <RowSkeleton key={i} />)}</div>
              : ordersList.length === 0
                ? <EmptyState icon={ShoppingBag} message={t('dashboard.noOrders')} href="/parts" cta={t('dashboard.empty.shopParts')} />
                : <div className="space-y-px">{ordersList.map(o => <OrderRow key={o.id} order={o} />)}</div>
            }
          </div>
        )}

        {/* Listings tab */}
        {activeTab === 'listings' && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <span className="text-otb-text text-[10px] font-medium uppercase tracking-[0.25em]">{t('dashboard.section.marketplace')}</span>
                <h2 className="text-xl font-bold text-otb-text uppercase">{t('dashboard.listings')}</h2>
              </div>
              <Link href="/marketplace/sell"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#f59e0b] hover:bg-[#e08e00] text-neutral-950 text-xs font-bold uppercase tracking-[0.15em] transition-colors">
                <Plus className="h-3.5 w-3.5" /> {t('marketplace.sell')}
              </Link>
            </div>
            {loading.listings
              ? <div className="space-y-px">{[1,2,3].map(i => <RowSkeleton key={i} />)}</div>
              : listings.length === 0
                ? <EmptyState icon={Bike} message={t('dashboard.noListings')} href="/marketplace/sell" cta={t('dashboard.empty.listBike')} />
                : <div className="space-y-px">{listings.map(b => <ListingRow key={b.id} bike={b} />)}</div>
            }
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-otb-page race-stripes flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#e51b23] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}
