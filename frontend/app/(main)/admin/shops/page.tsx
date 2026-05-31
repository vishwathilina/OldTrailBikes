'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { shops as shopsApi, ApiClientError } from '@/lib/api';
import type { Shop } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AdminShopsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pending, setPending] = useState<Shop[]>([]);

  async function loadPending() {
    setLoading(true);
    try {
      const res = await shopsApi.pending();
      setPending(res.shops);
    } catch {
      toast.error(t('admin.shops.toast.loadError'));
      setPending([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/admin/shops');
      return;
    }
    if (user?.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    void loadPending();
  }, [authLoading, isAuthenticated, user?.role, router]);

  async function act(id: string, type: 'approve' | 'suspend') {
    setSavingId(id);
    try {
      if (type === 'approve') {
        await shopsApi.approve(id);
        toast.success(t('admin.shops.toast.approved'));
      } else {
        await shopsApi.suspend(id);
        toast.success(t('admin.shops.toast.suspended'));
      }
      await loadPending();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t('admin.shops.toast.actionError'));
    } finally {
      setSavingId(null);
    }
  }

  if (authLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-otb-page race-stripes">
        <Loader2 className="h-8 w-8 animate-spin text-[#e51b23]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-otb-page race-stripes">
      <div className="border-b border-otb-border bg-otb-surface">
        <div className="section-container py-6 md:py-8">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-[#e51b23] text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-otb-text uppercase tracking-tight">
                  {t('admin.shops.title')}
                </h1>
                <p className="text-otb-text/55 text-sm mt-1">{t('admin.shops.sub')}</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">Back</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="section-container py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#e51b23]" />
          </div>
        ) : pending.length === 0 ? (
          <p className="text-center text-otb-text/55 py-16">{t('admin.shops.none')}</p>
        ) : (
          <ul className="space-y-4">
            {pending.map((shop) => (
              <li
                key={shop.id}
                className="border border-otb-border bg-otb-surface p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-lg font-bold text-otb-text">{shop.name}</p>
                  <p className="text-sm text-otb-text/60 mt-1 break-words">
                    {shop.contactEmail} · {shop.contactPhone}
                  </p>
                  <p className="text-xs text-otb-text/45 mt-1">/{shop.slug}</p>
                  {shop.description && <p className="text-sm text-otb-text mt-3">{shop.description}</p>}
                  <span className={cn('mt-3 inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#f59e0b]/15 text-[#f59e0b]')}>
                    {t('admin.shops.pending')}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    disabled={savingId === shop.id}
                    onClick={() => void act(shop.id, 'approve')}
                  >
                    {t('admin.shops.approve')}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={savingId === shop.id}
                    onClick={() => void act(shop.id, 'suspend')}
                  >
                    {t('admin.shops.suspend')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

