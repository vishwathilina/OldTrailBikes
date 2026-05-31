'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Pencil, Plus, Store, Trash2, Upload, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { brands as brandsApi, parts as partsApi, shops as shopsApi, ApiClientError } from '@/lib/api';
import type { Brand, PartCategory, Shop, SparePart } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';

type FormData = {
  name: string;
  categoryId: string;
  brandId?: string;
  price: string;
  stockQuantity: string;
  description?: string;
};

const inputCls =
  'w-full rounded-md border border-otb-border bg-otb-surface px-4 py-3 text-sm text-otb-text shadow-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e51b23]/20 focus:border-[#e51b23]/45 transition-colors';

function normalizeSizes(values: string[]) {
  return values.map((s) => s.trim()).filter(Boolean);
}

export default function ShopDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [myParts, setMyParts] = useState<SparePart[]>([]);
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [busyPartId, setBusyPartId] = useState<string | null>(null);
  const [newPartPhotos, setNewPartPhotos] = useState<File[]>([]);
  const [createSizes, setCreateSizes] = useState<string[]>(['']);
  const [editSizes, setEditSizes] = useState<string[]>(['']);

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2).max(200),
        categoryId: z.string().uuid(),
        brandId: z.string().optional(),
        price: z.string().refine((v) => Number(v) >= 0),
        stockQuantity: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0),
        description: z.string().max(4000).optional().or(z.literal('')),
      }),
    [],
  );

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      categoryId: '',
      brandId: '',
      price: '',
      stockQuantity: '0',
      description: '',
    },
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [{ shop: me }, categoryRes, brandRes] = await Promise.all([
        shopsApi.me(),
        partsApi.categories(),
        brandsApi.list(),
      ]);
      setShop(me);
      setCategories(categoryRes.categories);
      setBrands(brandRes.brands);

      const partsRes = await partsApi.list({ shopId: me.id, pageSize: 100 });
      setMyParts(partsRes.items);
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 404) {
        router.replace('/shop/apply');
        return;
      }
      toast.error(t('shop.dashboard.toast.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/shop/dashboard');
      return;
    }
    void loadAll();
  }, [authLoading, isAuthenticated, router]);

  async function onSubmit(data: FormData) {
    if (!shop || shop.status !== 'APPROVED') {
      toast.error(t('shop.dashboard.notApproved'));
      return;
    }
    try {
      const { part } = await partsApi.create({
        categoryId: data.categoryId,
        brandId: data.brandId || undefined,
        name: data.name,
        description: data.description || undefined,
        compatibleBikes: normalizeSizes(createSizes),
        price: Number(data.price),
        stockQuantity: Number(data.stockQuantity),
      });
      if (newPartPhotos.length > 0) {
        await partsApi.uploadPhotos(part.id, newPartPhotos);
      }
      toast.success(t('shop.dashboard.toast.created'));
      reset({
        name: '',
        categoryId: '',
        brandId: '',
        price: '',
        stockQuantity: '0',
        description: '',
      });
      setNewPartPhotos([]);
      setCreateSizes(['']);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t('shop.dashboard.toast.error'));
    }
  }

  async function onUpdate(data: FormData) {
    if (!editing) return;
    try {
      await partsApi.update(editing.id, {
        categoryId: data.categoryId,
        brandId: data.brandId || null,
        name: data.name,
        description: data.description || null,
        compatibleBikes: normalizeSizes(editSizes),
        price: Number(data.price),
        stockQuantity: Number(data.stockQuantity),
      });
      toast.success('Part updated');
      setEditing(null);
      setEditSizes(['']);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t('shop.dashboard.toast.error'));
    }
  }

  async function removePart(id: string) {
    if (!confirm('Delete this part?')) return;
    setBusyPartId(id);
    try {
      await partsApi.delete(id);
      toast.success('Part deleted');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t('shop.dashboard.toast.error'));
    } finally {
      setBusyPartId(null);
    }
  }

  async function uploadImages(partId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusyPartId(partId);
    try {
      await partsApi.uploadPhotos(partId, Array.from(files).slice(0, 12));
      toast.success('Images uploaded');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t('shop.dashboard.toast.error'));
    } finally {
      setBusyPartId(null);
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
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-[#e51b23] text-white">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-otb-text uppercase tracking-tight">
                  {t('shop.dashboard.title')}
                </h1>
                <p className="text-otb-text/60 text-sm mt-1">{t('shop.dashboard.sub')}</p>
              </div>
            </div>
            {shop?.status !== 'APPROVED' && (
              <Link href="/shop/apply" className="px-4 py-2 border border-otb-border text-sm text-otb-text hover:border-[#e51b23]/50 transition-colors">
                {t('shop.apply.me')}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="section-container py-8 grid lg:grid-cols-2 gap-8 items-start">
        <div className="border border-otb-border bg-otb-surface p-6">
          <h2 className="text-lg font-bold text-otb-text mb-4">{t('shop.dashboard.addPart')}</h2>
          {shop?.status !== 'APPROVED' && (
            <p className="mb-4 text-sm text-[#f59e0b]">
              {t('shop.dashboard.notApproved')} ({shop?.status})
            </p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-4', shop?.status !== 'APPROVED' && 'opacity-70')}>
            <div>
              <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.dashboard.partName')}</label>
              <input {...register('name')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.dashboard.partCategory')}</label>
              <select {...register('categoryId')} className={inputCls}>
                <option value="">Select...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.dashboard.partBrand')}</label>
              <select {...register('brandId')} className={inputCls}>
                <option value="">-</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.dashboard.partPrice')}</label>
                <input {...register('price')} type="number" min={0} step="0.01" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.dashboard.partStock')}</label>
                <input {...register('stockQuantity')} type="number" min={0} step="1" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.dashboard.partCompat')} ({t('common.optional')})</label>
              <div className="space-y-2">
                {createSizes.map((size, idx) => (
                  <div key={`create-size-${idx}`} className="flex items-center gap-2">
                    <input
                      value={size}
                      onChange={(e) =>
                        setCreateSizes((prev) => prev.map((s, i) => (i === idx ? e.target.value : s)))
                      }
                      placeholder={`size ${idx + 1}`}
                      className={inputCls}
                    />
                    {createSizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCreateSizes((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-2 border border-otb-border text-otb-text hover:border-[#e51b23]/50"
                        aria-label="Remove size"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCreateSizes((prev) => [...prev, ''])}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-otb-border text-xs font-semibold hover:border-[#e51b23]/50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add size
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.dashboard.partDesc')}</label>
              <textarea {...register('description')} rows={3} className={cn(inputCls, 'resize-none')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-otb-text">Images ({t('common.optional')})</label>
              <label className="inline-flex items-center gap-2 px-3 py-2 border border-otb-border text-xs font-semibold cursor-pointer hover:border-[#e51b23]/50">
                <Upload className="h-3.5 w-3.5" />
                Select images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setNewPartPhotos(e.target.files ? Array.from(e.target.files).slice(0, 12) : [])}
                />
              </label>
              {newPartPhotos.length > 0 && (
                <p className="mt-2 text-xs text-otb-text/60">{newPartPhotos.length} image(s) selected</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting || shop?.status !== 'APPROVED'}
              className="w-full sm:w-auto px-6 py-3 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {t('shop.dashboard.submit')}
            </button>
          </form>
        </div>

        <div className="border border-otb-border bg-otb-surface p-6">
          <h2 className="text-lg font-bold text-otb-text mb-4">{t('shop.dashboard.myParts')}</h2>
          {myParts.length === 0 ? (
            <p className="text-sm text-otb-text/60">{t('shop.dashboard.noParts')}</p>
          ) : (
            <div className="space-y-3">
              {myParts.map((part) => (
                <div key={part.id} className="border border-otb-border bg-otb-page p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-otb-text">{part.name}</p>
                      <p className="text-xs text-otb-text/60 mt-1">
                        LKR {Number(part.price).toLocaleString()} · Stock {part.stockQuantity}
                      </p>
                      <p className="text-xs text-otb-text/45 mt-1">{part.category.name}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="p-2 border border-otb-border hover:border-[#e51b23]/50 text-otb-text"
                        onClick={() => {
                          setEditing(part);
                          reset({
                            name: part.name,
                            categoryId: part.category.id,
                            brandId: part.brand?.id ?? '',
                            price: String(part.price),
                            stockQuantity: String(part.stockQuantity),
                            description: part.description ?? '',
                          });
                          setEditSizes(part.compatibleBikes.length > 0 ? part.compatibleBikes : ['']);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="p-2 border border-otb-border hover:border-[#e51b23]/50 text-otb-text"
                        disabled={busyPartId === part.id}
                        onClick={() => void removePart(part.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {part.compatibleBikes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {part.compatibleBikes.map((s) => (
                        <span key={`${part.id}-${s}`} className="px-2 py-0.5 text-[11px] bg-otb-text/10 text-otb-text rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-3 py-2 border border-otb-border text-xs font-semibold cursor-pointer hover:border-[#e51b23]/50">
                      <Upload className="h-3.5 w-3.5" />
                      Add images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => void uploadImages(part.id, e.target.files)}
                      />
                    </label>
                    {busyPartId === part.id && <Loader2 className="h-4 w-4 animate-spin text-[#e51b23]" />}
                  </div>

                  {part.photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {part.photos.slice(0, 8).map((url) => (
                        <img key={url} src={url} alt="" className="h-14 w-full object-cover rounded border border-otb-border" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl border border-otb-border bg-otb-surface p-6">
            <h3 className="text-lg font-bold text-otb-text mb-4">Edit part</h3>
            <form onSubmit={handleSubmit(onUpdate)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.dashboard.partName')}</label>
                <input {...register('name')} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.dashboard.partPrice')}</label>
                  <input {...register('price')} type="number" min={0} step="0.01" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.dashboard.partStock')}</label>
                  <input {...register('stockQuantity')} type="number" min={0} step="1" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-otb-text">{t('shop.dashboard.partCompat')} ({t('common.optional')})</label>
                <div className="space-y-2">
                  {editSizes.map((size, idx) => (
                    <div key={`edit-size-${idx}`} className="flex items-center gap-2">
                      <input
                        value={size}
                        onChange={(e) =>
                          setEditSizes((prev) => prev.map((s, i) => (i === idx ? e.target.value : s)))
                        }
                        placeholder={`size ${idx + 1}`}
                        className={inputCls}
                      />
                      {editSizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditSizes((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-2 border border-otb-border text-otb-text hover:border-[#e51b23]/50"
                          aria-label="Remove size"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditSizes((prev) => [...prev, ''])}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-otb-border text-xs font-semibold hover:border-[#e51b23]/50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add size
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-otb-border text-sm"
                  onClick={() => {
                    setEditing(null);
                    setEditSizes(['']);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[#e51b23] text-white text-sm font-semibold" disabled={isSubmitting}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

