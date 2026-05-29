// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types — mirrors backend Prisma/service types.
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'CUSTOMER' | 'SHOP' | 'ADMIN';
export type Language = 'EN' | 'SI';
export type EngineType = 'TWO_STROKE' | 'FOUR_STROKE' | 'ELECTRIC';
export type ListingStatus = 'AVAILABLE' | 'PENDING' | 'SOLD';
export type AppointmentStatus = 'PENDING' | 'INSPECTED' | 'WAITING_FOR_PARTS' | 'REPAIRED';
export type IssueCategory =
  | 'ENGINE_2_STROKE_REBUILD'
  | 'ENGINE_4_STROKE_REBUILD'
  | 'SUSPENSION_TUNING'
  | 'BRAKE_REPAIR'
  | 'ELECTRICAL_FAULT'
  | 'DRIVE_ISSUE'
  | 'TYRE_WORK'
  | 'OTHER';
export type ShopStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'FULFILLED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  preferredLanguage: Language;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  user: User;
  tokens: AuthTokens;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface MechanicVerification {
  id: string;
  listingId: string;
  inspectionNotes: string;
  verifiedAt: string;
  admin: { id: string; fullName: string };
}

export interface BikeForSale {
  id: string;
  sellerId: string;
  seller: { id: string; fullName: string; phone: string | null };
  brand: Brand;
  model: string;
  year: number;
  engineType: EngineType;
  mileageKm: number;
  fuelConsumption: number | null;
  price: string;
  currency: string;
  description: string;
  location: string;
  photos: string[];
  whatsappNumber: string | null;
  phoneNumber: string | null;
  status: ListingStatus;
  isMechanicVerified: boolean;
  verification: MechanicVerification | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceBike {
  id: string;
  registrationPlate: string;
  brand: Brand | null;
  model: string | null;
  year: number | null;
  engineType: EngineType | null;
}

export interface Appointment {
  id: string;
  customerId: string;
  customer: { id: string; fullName: string; email: string; phone: string | null; preferredLanguage: Language };
  serviceBike: ServiceBike & { brand: Brand | null };
  issueCategory: IssueCategory;
  customerMessage: string | null;
  preInspectionPhotos: string[];
  contactPhone: string;
  preferredDate: string;
  status: AppointmentStatus;
  adminNotes: string | null;
  estimatedCost: string | null;
  finalCost: string | null;
  inspectedAt: string | null;
  repairedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Shop {
  id: string;
  ownerUserId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  contactEmail: string;
  contactPhone: string;
  address: string | null;
  status: ShopStatus;
  commissionRate: string;
  createdAt: string;
}

export interface SparePart {
  id: string;
  shopId: string;
  shop: { id: string; name: string; slug: string };
  brand: Brand | null;
  category: PartCategory;
  name: string;
  description: string | null;
  compatibleBikes: string[];
  price: string;
  currency: string;
  stockQuantity: number;
  photos: string[];
  isActive: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  partId: string;
  part: { id: string; name: string };
  shopId: string;
  shop: { id: string; name: string; slug: string };
  quantity: number;
  unitPrice: string;
  commissionRate: string;
  commissionAmount: string;
  lineTotal: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer: { id: string; fullName: string; email: string; phone: string | null };
  status: OrderStatus;
  subtotal: string;
  total: string;
  currency: string;
  shippingAddress: Record<string, string> | null;
  items: OrderItem[];
  paymentReference: string | null;
  placedAt: string;
  paidAt: string | null;
}

export interface PayhereCheckoutParams {
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  currency: string;
  amount: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  hash: string;
  checkout_url: string;
}

export interface Review {
  id: string;
  authorId: string;
  author: { id: string; fullName: string };
  rating: number;
  comment: string | null;
  targetType: 'APPOINTMENT' | 'PART';
  appointmentId: string | null;
  partId: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CartItem {
  part: SparePart;
  quantity: number;
}
