'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Typed API client for the OldTrailBikes backend.
// All methods throw ApiClientError on non-2xx responses.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AuthPayload,
  Appointment,
  BikeForSale,
  Brand,
  Order,
  PaginatedResult,
  PartCategory,
  PayhereCheckoutParams,
  Review,
  Shop,
  SparePart,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'API_ERROR',
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('otb_access_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  rawBody = false,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(rawBody ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: { message: 'Request failed', code: 'UNKNOWN' } }));
    throw new ApiClientError(
      res.status,
      payload.error?.message ?? 'Request failed',
      payload.error?.code ?? 'API_ERROR',
    );
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/** multipart/form-data (do not set Content-Type — browser sets boundary) */
async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: { message: 'Request failed', code: 'UNKNOWN' } }));
    throw new ApiClientError(
      res.status,
      payload.error?.message ?? 'Request failed',
      payload.error?.code ?? 'API_ERROR',
    );
  }

  return res.json() as Promise<T>;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
}

function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
}

function del<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined });
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export const auth = {
  register: (data: { email: string; password: string; fullName: string; phone?: string; preferredLanguage?: string }) =>
    post<AuthPayload>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    post<AuthPayload>('/auth/login', data),

  refresh: (refreshToken: string) =>
    post<{ tokens: { accessToken: string; refreshToken: string } }>('/auth/refresh', { refreshToken }),

  logout: () => post<{ ok: boolean }>('/auth/logout'),

  me: () => get<{ user: import('./types').User }>('/auth/me'),
};

// ─── Brands ────────────────────────────────────────────────────────────────

export const brands = {
  list: () => get<{ brands: Brand[] }>('/brands'),
};

// ─── Appointments ──────────────────────────────────────────────────────────

export const appointments = {
  create: (data: {
    registrationPlate: string;
    brandId?: string;
    model?: string;
    year?: number;
    engineType?: string;
    issueCategory: string;
    customerMessage?: string;
    contactPhone: string;
    preferredDate: string;
    preInspectionPhotos?: string[];
  }) => post<{ appointment: Appointment }>('/appointments', data),

  mine: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return get<PaginatedResult<Appointment> & { items: Appointment[] }>(`/appointments/mine${q ? `?${q}` : ''}`);
  },

  byId: (id: string) => get<{ appointment: Appointment }>(`/appointments/${id}`),

  byPlate: (plate: string) =>
    get<{ bike: import('./types').ServiceBike; appointments: Appointment[] }>(
      `/appointments/by-plate/${encodeURIComponent(plate)}`,
    ),

  uploadPhotos: (id: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    return postFormData<{ appointment: Appointment }>(`/appointments/${id}/photos`, fd);
  },

  // Admin
  listAll: (params?: { status?: string; customerId?: string; plate?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return get<PaginatedResult<Appointment>>(`/appointments${q ? `?${q}` : ''}`);
  },

  transition: (id: string, data: { status: string; estimatedCost?: number; finalCost?: number; adminNotes?: string }) =>
    patch<{ appointment: Appointment }>(`/appointments/${id}/status`, data),

  update: (id: string, data: { adminNotes?: string; estimatedCost?: number; finalCost?: number }) =>
    patch<{ appointment: Appointment }>(`/appointments/${id}`, data),
};

// ─── Bikes (Marketplace) ───────────────────────────────────────────────────

export const bikes = {
  list: (params?: {
    brandId?: string;
    engineType?: string;
    minPrice?: number;
    maxPrice?: number;
    verified?: boolean;
    sellerId?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])),
    ).toString();
    return get<PaginatedResult<BikeForSale>>(`/bikes${q ? `?${q}` : ''}`);
  },

  byId: (id: string) => get<{ listing: BikeForSale }>(`/bikes/${id}`),

  create: (data: Record<string, unknown>) => post<{ listing: BikeForSale }>('/bikes', data),

  update: (id: string, data: Record<string, unknown>) =>
    patch<{ listing: BikeForSale }>(`/bikes/${id}`, data),

  updateStatus: (id: string, status: string) =>
    patch<{ listing: BikeForSale }>(`/bikes/${id}/status`, { status }),

  delete: (id: string) => del<{ ok: boolean }>(`/bikes/${id}`),

  verify: (id: string, inspectionNotes: string) =>
    post<{ listing: BikeForSale }>(`/bikes/${id}/verify`, { inspectionNotes }),

  unverify: (id: string) => del<{ listing: BikeForSale }>(`/bikes/${id}/verify`),

  uploadPhotos: (id: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    return postFormData<{ listing: BikeForSale }>(`/bikes/${id}/photos`, fd);
  },
};

// ─── Shops ─────────────────────────────────────────────────────────────────

export const shops = {
  list: (params?: { page?: number; pageSize?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return get<PaginatedResult<Shop>>(`/shops${q ? `?${q}` : ''}`);
  },

  bySlug: (slug: string) => get<{ shop: Shop }>(`/shops/${slug}`),

  apply: (data: Record<string, unknown>) => post<{ shop: Shop }>('/shops/apply', data),

  me: () => get<{ shop: Shop }>('/shops/me'),

  updateMe: (data: Record<string, unknown>) => patch<{ shop: Shop }>('/shops/me', data),

  dashboard: () => get<{ shop: Shop; totalRevenue: number; totalCommission: number; orderCount: number }>('/shops/me/dashboard'),

  // Admin
  pending: () => get<{ shops: Shop[] }>('/shops/admin/pending'),
  approve: (id: string) => post<{ shop: Shop }>(`/shops/${id}/approve`),
  suspend: (id: string) => post<{ shop: Shop }>(`/shops/${id}/suspend`),
  updateCommission: (id: string, rate: number) => patch<{ shop: Shop }>(`/shops/${id}/commission`, { commissionRate: rate }),
};

// ─── Parts ─────────────────────────────────────────────────────────────────

export const parts = {
  categories: () => get<{ categories: PartCategory[] }>('/parts/categories'),

  list: (params?: {
    shopId?: string; categoryId?: string; brandId?: string; search?: string;
    minPrice?: number; maxPrice?: number; page?: number; pageSize?: number;
  }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])),
    ).toString();
    return get<PaginatedResult<SparePart>>(`/parts${q ? `?${q}` : ''}`);
  },

  byId: (id: string) => get<{ part: SparePart }>(`/parts/${id}`),

  create: (data: Record<string, unknown>) => post<{ part: SparePart }>('/parts', data),
  update: (id: string, data: Record<string, unknown>) => patch<{ part: SparePart }>(`/parts/${id}`, data),
  delete: (id: string) => del<{ ok: boolean }>(`/parts/${id}`),
  uploadPhotos: (id: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    return postFormData<{ part: SparePart }>(`/parts/${id}/photos`, fd);
  },
  deletePhoto: (id: string, photoUrl: string) =>
    del<{ part: SparePart }>(`/parts/${id}/photos`, { photoUrl }),
};

// ─── Orders ────────────────────────────────────────────────────────────────

export const orders = {
  create: (data: {
    items: { partId: string; quantity: number }[];
    shippingAddress?: Record<string, string>;
  }) => post<{ order: Order; checkout: PayhereCheckoutParams }>('/orders', data),

  mine: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return get<PaginatedResult<Order>>(`/orders/mine${q ? `?${q}` : ''}`);
  },

  byId: (id: string) => get<{ order: Order }>(`/orders/${id}`),

  shopSales: (params?: { page?: number; pageSize?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return get<PaginatedResult<Order>>(`/orders/shop/sales${q ? `?${q}` : ''}`);
  },
};

// ─── Reviews ───────────────────────────────────────────────────────────────

export const reviews = {
  forAppointment: (id: string) => get<{ reviews: Review[] }>(`/reviews/appointment/${id}`),
  forPart: (id: string) => get<{ reviews: Review[]; averageRating: number | null; count: number }>(`/reviews/part/${id}`),

  create: (data: {
    targetType: 'APPOINTMENT' | 'PART';
    appointmentId?: string;
    partId?: string;
    rating: number;
    comment?: string;
  }) => post<{ review: Review }>('/reviews', data),

  update: (id: string, data: { rating?: number; comment?: string | null }) =>
    patch<{ review: Review }>(`/reviews/${id}`, data),

  delete: (id: string) => del<{ ok: boolean }>(`/reviews/${id}`),
};
