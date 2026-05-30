'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ShoppingCart, Plus, Minus, Search, SlidersHorizontal,
  Package, Trash2, X, ArrowRight,
} from 'lucide-react';
import { parts as partsApi, brands as brandsApi, orders as ordersApi, ApiClientError } from '@/lib/api';
import type { SparePart, Brand, PartCategory, PayhereCheckoutParams } from '@/lib/types';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { cn } from '@/lib/utils';
import { buildPartSlug } from '@/lib/parts-slug';

const PAGE_SIZE = 16;

function postToPayHere(checkout: PayhereCheckoutParams) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkout.checkout_url;
  form.style.display = 'none';

  const fields: Omit<PayhereCheckoutParams, 'checkout_url'> = {
    merchant_id: checkout.merchant_id,
    return_url: checkout.return_url,
    cancel_url: checkout.cancel_url,
    notify_url: checkout.notify_url,
    order_id: checkout.order_id,
    items: checkout.items,
    currency: checkout.currency,
    amount: checkout.amount,
    first_name: checkout.first_name,
    last_name: checkout.last_name,
    email: checkout.email,
    phone: checkout.phone,
    address: checkout.address,
    city: checkout.city,
    country: checkout.country,
    hash: checkout.hash,
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

// ─── Part Card ────────────────────────────────────────────────────────────────
function PartCard({ part }: { part: SparePart }) {
  const { t }                    = useLanguage();
  const { addItem, removeItem, updateQuantity, items } = useCart();
  const inCart   = items.find(i => i.part.id === part.id);
  const quantity = inCart?.quantity ?? 0;
  const outOfStock = part.stockQuantity === 0;
  const detailHref = `/parts/${buildPartSlug(part)}`;

  return (
    <div className={cn(
      'group relative flex min-w-0 flex-col bg-otb-surface border border-otb-border overflow-hidden hover:border-[#f59e0b]/40 transition-all',
      outOfStock && 'opacity-60',
    )}>
      {/* Top accent on hover */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#f59e0b] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />

      {/* Photo */}
      <Link
        href={detailHref}
        className="relative block aspect-square overflow-hidden bg-otb-page outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 focus-visible:ring-offset-otb-surface"
        prefetch={false}
      >
        {part.photos?.[0]
          ? <img src={part.photos[0]} alt={part.name} className="h-full w-full object-contain p-3 transition-transform duration-400 group-hover:scale-105" />
          : <div className="flex h-full w-full items-center justify-center"><Package className="h-8 w-8 text-otb-text/10" /></div>
        }
        {outOfStock && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em] bg-[#e51b23] px-3 py-1">
              {t('parts.outOfStock')}
            </span>
          </div>
        )}
        {part.stockQuantity > 0 && part.stockQuantity <= 5 && (
          <div className="pointer-events-none absolute bottom-2 right-2 bg-[#f59e0b] px-2 py-0.5">
            <span className="text-[10px] font-bold text-neutral-950 uppercase tracking-wider">{t('parts.onlyLeft', { count: part.stockQuantity })}</span>
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <div className="mb-1 min-w-0">
          <p className="mb-0.5 truncate text-[10px] font-medium uppercase tracking-[0.15em] text-otb-text/30 sm:text-[11px]">{part.category?.name ?? '-'}</p>
          <Link
            href={detailHref}
            prefetch={false}
            className="block font-bold uppercase leading-tight text-otb-text outline-none line-clamp-2 text-xs hover:text-[#f59e0b] sm:text-sm focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 focus-visible:ring-offset-otb-surface"
          >
            {part.name}
          </Link>
          {part.shop?.name && <p className="text-[10px] text-otb-text/30 mt-0.5 truncate">{part.shop.name}</p>}
        </div>

        {part.compatibleBikes && part.compatibleBikes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 mb-2 sm:mb-3">
            {part.compatibleBikes.map(b => (
              <span key={b} className="text-[9px] sm:text-[10px] font-bold text-otb-text/40 uppercase tracking-wide px-1.5 py-0.5 bg-otb-text/[0.06] max-w-full truncate">{b}</span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between mt-auto pt-3 border-t border-otb-border/40 sm:border-0">
          <span className="font-bold text-[#f59e0b] text-sm sm:text-base shrink-0">{t('common.lkr')} {Number(part.price).toLocaleString()}</span>

          {quantity > 0 ? (
            <div className="flex items-center justify-end sm:justify-start gap-0 self-end sm:self-auto touch-manipulation">
              <button type="button" aria-label={quantity === 1 ? t('parts.aria.removeLine') : t('parts.aria.decreaseQty')} onClick={() => quantity === 1 ? removeItem(part.id) : updateQuantity(part.id, quantity - 1)}
                className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center bg-[#e51b23]/20 hover:bg-[#e51b23] text-[#e51b23] hover:text-white transition-colors active:scale-95">
                {quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              </button>
              <span className="w-9 sm:w-8 text-center font-bold text-otb-text text-sm tabular-nums">{quantity}</span>
              <button
                type="button"
                aria-label={t('parts.aria.increaseQty')}
                disabled={quantity >= part.stockQuantity}
                onClick={() => addItem(part)}
                className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center bg-[#f59e0b]/20 hover:bg-[#f59e0b] text-[#f59e0b] hover:text-neutral-950 transition-colors disabled:opacity-30 active:scale-95">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => { addItem(part); toast.success(t('parts.toast.added', { name: part.name }), { duration: 1500 }); }}
              className="flex w-full sm:w-auto items-center justify-center gap-1.5 min-h-10 px-3 py-2.5 sm:py-2 bg-[#f59e0b] hover:bg-[#e08e00] text-neutral-950 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 touch-manipulation active:scale-[0.98]">
              <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
              {t('parts.addToCart')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-otb-surface border border-otb-border">
      <div className="aspect-square bg-otb-elevated animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-otb-elevated animate-pulse w-1/3" />
        <div className="h-4 bg-otb-elevated animate-pulse w-2/3" />
        <div className="h-8 bg-otb-elevated animate-pulse mt-3" />
      </div>
    </div>
  );
}

// ─── Cart Sidebar ─────────────────────────────────────────────────────────────
function CartSidebar({
  open,
  onClose,
  onCheckout,
  checkingOut,
}: {
  open: boolean;
  onClose: () => void;
  onCheckout: () => Promise<void>;
  checkingOut: boolean;
}) {
  const { t } = useLanguage();
  const { items, total, removeItem, updateQuantity } = useCart();

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" aria-hidden onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-[min(100vw,24rem)] flex-col border-l border-otb-border bg-otb-surface pt-[env(safe-area-inset-top)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="parts-cart-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-otb-border p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[#f59e0b]" />
            <h2 id="parts-cart-title" className="font-bold text-otb-text uppercase text-base sm:text-lg">{t('parts.cart')}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-otb-text/40 transition-colors hover:text-otb-text touch-manipulation" aria-label={t('common.close')}><X className="h-5 w-5" /></button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:px-8">
            <ShoppingCart className="mb-4 h-12 w-12 text-otb-text/10" />
            <p className="text-sm text-otb-text/40">{t('parts.emptyCart')}</p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain divide-y divide-white/[0.06]">
              {items.map(item => (
                <div key={item.part.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden bg-otb-page sm:h-12 sm:w-12">
                      {item.part.photos?.[0]
                        ? <img src={item.part.photos[0]} alt="" className="h-full w-full object-contain p-1" />
                        : <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-otb-text/15" /></div>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase leading-tight text-otb-text line-clamp-2">{item.part.name}</p>
                      <p className="mt-0.5 text-xs font-bold text-[#f59e0b]">{t('common.lkr')} {(Number(item.part.price) * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-0 self-stretch sm:self-center touch-manipulation">
                    <button type="button" aria-label={item.quantity === 1 ? t('parts.aria.removeLine') : t('parts.aria.decreaseQty')} onClick={() => item.quantity === 1 ? removeItem(item.part.id) : updateQuantity(item.part.id, item.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center bg-otb-text/5 hover:bg-[#e51b23]/20 text-otb-text/50 hover:text-[#e51b23] transition-colors active:scale-95 sm:h-7 sm:w-7">
                      {item.quantity === 1 ? <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> : <Minus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
                    </button>
                    <span className="w-9 text-center text-sm font-bold tabular-nums text-otb-text sm:w-7">{item.quantity}</span>
                    <button type="button" aria-label={t('parts.aria.increaseQty')} disabled={item.quantity >= item.part.stockQuantity} onClick={() => updateQuantity(item.part.id, item.quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center bg-otb-text/5 hover:bg-[#f59e0b]/20 text-otb-text/50 hover:text-[#f59e0b] transition-colors disabled:opacity-30 active:scale-95 sm:h-7 sm:w-7">
                      <Plus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 space-y-4 border-t border-otb-border bg-otb-surface p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-otb-text/50 text-xs font-medium uppercase tracking-wider">{t('common.total')}</span>
                <span className="font-bold text-otb-text text-xl">{t('common.lkr')} {total.toLocaleString()}</span>
              </div>
              <button
                type="button"
                onClick={() => void onCheckout()}
                disabled={checkingOut}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#f59e0b] hover:bg-[#e08e00] text-neutral-950 text-xs font-bold uppercase tracking-[0.2em] transition-colors disabled:opacity-60"
              >
                {t('parts.checkout')} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PartsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { t }          = useLanguage();
  const searchParams   = useSearchParams();
  const { items } = useCart();

  const [partsList,    setPartsList]    = useState<SparePart[]>([]);
  const [categories,   setCategories]   = useState<PartCategory[]>([]);
  const [allBrands,    setAllBrands]    = useState<Brand[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [cartOpen,     setCartOpen]     = useState(false);
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const [checkingOut,  setCheckingOut]  = useState(false);

  const [search,     setSearch]     = useState('');
  const [categoryId,   setCategoryId]   = useState('');
  const [brandId,    setBrandId]    = useState('');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await partsApi.list({ categoryId: categoryId || undefined, brandId: brandId || undefined, search: search || undefined, page, pageSize: PAGE_SIZE });
      setPartsList(r.items);
      setTotal(r.total);
    } catch { toast.error(t('parts.toast.loadError')); }
    finally { setLoading(false); }
  }, [categoryId, brandId, search, page, t]);

  useEffect(() => { void fetchParts(); }, [fetchParts]);
  useEffect(() => {
    brandsApi.list().then(r => setAllBrands(r.brands)).catch(() => {});
    partsApi.categories().then(r => setCategories(r.categories)).catch(() => {});
  }, []);
  useEffect(() => {
    if (searchParams.get('cart') === '1') setCartOpen(true);
  }, [searchParams]);

  async function handleCheckout() {
    if (items.length === 0) {
      toast.error(t('parts.emptyCart'));
      return;
    }
    if (!isAuthenticated) {
      router.push('/login?next=/parts?cart=1');
      return;
    }
    setCheckingOut(true);
    try {
      const { checkout } = await ordersApi.create({
        items: items.map((i) => ({ partId: i.part.id, quantity: i.quantity })),
      });
      setCartOpen(false);
      if (checkout?.checkout_url) {
        postToPayHere(checkout);
      } else {
        toast.success('Order placed');
      }
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t('auth.error.generic'));
    } finally {
      setCheckingOut(false);
    }
  }

  const clearFilters = () => { setCategoryId(''); setBrandId(''); setSearch(''); setPage(1); };
  const hasFilters = categoryId || brandId || search;

  const FilterPanel = () => (
    <div className="space-y-5">
      <div>
        <label className="text-[10px] font-medium text-otb-text/40 uppercase tracking-[0.2em] block mb-2">{t('parts.filter.category')}</label>
        <div className="flex flex-col gap-0.5">
          <button onClick={() => { setCategoryId(''); setPage(1); }}
            className={cn('text-left px-3 py-2 text-xs font-semibold transition-colors', !categoryId ? 'bg-[#f59e0b] text-neutral-950' : 'text-otb-text/50 hover:text-otb-text hover:bg-otb-text/5')}>
            {t('parts.filter.allCategories')}
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => { setCategoryId(c.id); setPage(1); }}
              className={cn('text-left px-3 py-2 text-xs font-semibold transition-colors', categoryId === c.id ? 'bg-[#f59e0b] text-neutral-950' : 'text-otb-text/50 hover:text-otb-text hover:bg-otb-text/5')}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[10px] font-medium text-otb-text/40 uppercase tracking-[0.2em] block mb-2">{t('parts.filter.brandCompat')}</label>
        <div className="flex flex-col gap-0.5">
          <button onClick={() => { setBrandId(''); setPage(1); }}
            className={cn('text-left px-3 py-2 text-xs font-semibold transition-colors', !brandId ? 'bg-[#f59e0b] text-neutral-950' : 'text-otb-text/50 hover:text-otb-text hover:bg-otb-text/5')}>
            {t('parts.filter.allBrands')}
          </button>
          {allBrands.map(b => (
            <button key={b.id} onClick={() => { setBrandId(b.id); setPage(1); }}
              className={cn('text-left px-3 py-2 text-xs font-semibold transition-colors', brandId === b.id ? 'bg-[#f59e0b] text-neutral-950' : 'text-otb-text/50 hover:text-otb-text hover:bg-otb-text/5')}>
              {b.name}
            </button>
          ))}
        </div>
      </div>
      {hasFilters && (
        <button onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 py-2 border border-otb-text/10 text-otb-text/40 hover:text-otb-text/70 text-xs font-bold uppercase tracking-wider transition-colors">
          <X className="h-3.5 w-3.5" /> {t('common.clearFilters')}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-otb-page race-stripes">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="bg-otb-surface border-b border-otb-border">
        <div className="section-container relative overflow-hidden py-5 sm:py-6 md:py-8">
          <span aria-hidden className="absolute -right-2 top-0 hidden text-[110px] font-black uppercase leading-none text-otb-text/[0.04] select-none md:block">
            {t('parts.ghostTitle')}
          </span>
          <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-3">
                <span className="h-px w-6 shrink-0 bg-[#f59e0b] sm:w-8" />
                <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#f59e0b] sm:text-[10px] sm:tracking-[0.3em]">{t('parts.eyebrow')}</span>
              </div>
              <h1 className="font-display text-2xl font-black uppercase leading-[1.05] tracking-tight text-otb-text sm:text-4xl md:text-5xl">{t('parts.title')}</h1>
            </div>
            <div />
          </div>
        </div>
      </div>

      <div className="section-container py-5 sm:py-6 md:py-8">
        {/* Search + mobile filter toggle */}
        <div className="mb-5 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-stretch">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-otb-text/30" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('parts.searchPlaceholder')}
              className="min-h-11 w-full min-w-0 border border-otb-border bg-otb-surface py-2.5 pl-10 pr-3 text-sm text-otb-text placeholder:text-otb-text/25 transition-colors focus:border-[#f59e0b]/60 focus:outline-none sm:min-h-0 sm:py-3 sm:pr-4"
            />
          </div>
          <button type="button" onClick={() => setFiltersOpen(v => !v)}
            className={cn(
              'flex shrink-0 items-center justify-center gap-2 border px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors sm:px-4 sm:py-3 touch-manipulation',
              hasFilters ? 'border-[#f59e0b] text-[#f59e0b]' : 'border-otb-text/20 text-otb-text/60 hover:border-otb-text/30 hover:text-otb-text',
            )}>
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t('common.filters')}</span>
          </button>
        </div>

        {/* Mobile filters */}
        {filtersOpen && (
          <div className="mb-5 max-h-[min(70vh,28rem)] overflow-y-auto overscroll-y-contain border border-otb-border bg-otb-surface p-4 sm:p-5 lg:hidden [-webkit-overflow-scrolling:touch]">
            <FilterPanel />
          </div>
        )}

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="bg-otb-surface border border-otb-border p-5 sticky top-20">
              <p className="text-[10px] font-medium text-otb-text/30 uppercase tracking-[0.25em] mb-4">{t('parts.filter.heading')}</p>
              <FilterPanel />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <p className="mb-4 text-sm text-otb-text/30">{loading ? '' : `${total} ${total === 1 ? t('parts.part') : t('parts.parts')}`}</p>

            {loading ? (
              <div className="grid grid-cols-2 gap-px bg-white/[0.04] sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({length: 8}).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : partsList.length === 0 ? (
              <div className="border border-dashed border-otb-border py-20 flex flex-col items-center text-center">
                <Package className="h-12 w-12 text-otb-text/10 mb-4" />
                <p className="text-otb-text/40 text-sm">{t('parts.empty')}</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-4 text-[#f59e0b] text-xs font-bold uppercase tracking-wider hover:text-otb-text transition-colors">
                    {t('common.clearFilters')}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-px bg-white/[0.04] sm:grid-cols-3 xl:grid-cols-4">
                  {partsList.map(p => <PartCard key={p.id} part={p} />)}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-2 px-1">
                    <button type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="min-h-11 min-w-[5.5rem] touch-manipulation border border-otb-border px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-otb-text/60 transition-colors hover:border-otb-text/25 hover:text-otb-text disabled:opacity-30 sm:min-h-0 sm:px-4 sm:py-2.5">
                      {t('common.prev')}
                    </button>
                    <span className="min-h-11 flex min-w-0 items-center justify-center border border-otb-border bg-otb-surface px-3 py-2 text-center text-xs font-bold tabular-nums text-otb-text/60 sm:min-h-0 sm:px-4 sm:py-2">
                      {t('common.pageOf', { current: page, total: totalPages })}
                    </span>
                    <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                      className="min-h-11 min-w-[5.5rem] touch-manipulation border border-otb-border px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-otb-text/60 transition-colors hover:border-otb-text/25 hover:text-otb-text disabled:opacity-30 sm:min-h-0 sm:px-4 sm:py-2.5">
                      {t('common.nextPage')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <CartSidebar
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        checkingOut={checkingOut}
      />
    </div>
  );
}
