import { createHash } from 'node:crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';

// ─────────────────────────────────────────────────────────────────────────────
// PayHere Sri Lanka payment gateway service.
//
// Payment flow:
//   1. Backend creates Order, calls createCheckoutParams()
//   2. Returns params to frontend
//   3. Frontend POSTs params directly to PAYHERE_CHECKOUT_URL (form redirect)
//   4. Customer completes payment on PayHere
//   5. PayHere POSTs notification (urlencoded) to our /webhooks/payhere
//   6. Backend verifies hash with verifyNotificationHash(), updates order
//
// Hash spec (from PayHere docs):
//   Payment hash  = MD5( merchant_id + order_id + amount + currency + MD5(secret) )
//   Notify  hash  = MD5( merchant_id + order_id + payhere_amount + payhere_currency
//                        + status_code + MD5(secret) )
// All MD5 results are uppercased.
// ─────────────────────────────────────────────────────────────────────────────

export const PAYHERE_CHECKOUT_URL = env.isProduction
  ? 'https://www.payhere.lk/pay/checkout'
  : 'https://sandbox.payhere.lk/pay/checkout';

export const PAYHERE_STATUS = {
  SUCCESS: 2,
  PENDING: 0,
  CANCELLED: -1,
  FAILED: -2,
  CHARGEDBACK: -3,
} as const;

export type PayhereStatusCode = (typeof PAYHERE_STATUS)[keyof typeof PAYHERE_STATUS];

function md5upper(input: string): string {
  return createHash('md5').update(input).digest('hex').toUpperCase();
}

function assertConfigured(): void {
  if (!env.PAYHERE_MERCHANT_ID || !env.PAYHERE_MERCHANT_SECRET) {
    throw ApiError.internal('PayHere credentials are not configured on this server');
  }
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
  checkout_url: string; // convenience — the URL the frontend POSTs to
}

export interface CreateCheckoutInput {
  orderId: string;
  amount: number;
  description: string;
  customerFullName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress?: string;
  shippingCity?: string;
}

/**
 * Build the PayHere checkout form parameters, including the tamper-proof
 * payment hash. The frontend should POST these fields to checkout_url.
 */
export function createCheckoutParams(input: CreateCheckoutInput): PayhereCheckoutParams {
  assertConfigured();

  const currency = 'LKR';
  const amount = input.amount.toFixed(2);
  const secretHash = md5upper(env.PAYHERE_MERCHANT_SECRET!);
  const hash = md5upper(
    `${env.PAYHERE_MERCHANT_ID}${input.orderId}${amount}${currency}${secretHash}`,
  );

  const apiBase = `${env.APP_API_URL}${env.API_PREFIX}`;
  const nameParts = input.customerFullName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') || '-';

  return {
    merchant_id: env.PAYHERE_MERCHANT_ID!,
    return_url: `${env.APP_BASE_URL}/orders/${input.orderId}/success`,
    cancel_url: `${env.APP_BASE_URL}/orders/${input.orderId}/cancel`,
    notify_url: `${apiBase}/webhooks/payhere`,
    order_id: input.orderId,
    items: input.description,
    currency,
    amount,
    first_name: firstName,
    last_name: lastName,
    email: input.customerEmail,
    phone: input.customerPhone,
    address: input.shippingAddress ?? '',
    city: input.shippingCity ?? 'Colombo',
    country: 'Sri Lanka',
    hash,
    checkout_url: PAYHERE_CHECKOUT_URL,
  };
}

export interface PayhereNotificationBody {
  merchant_id: string;
  order_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
  payment_id?: string;
  custom_1?: string;
  custom_2?: string;
}

/**
 * Verify the MD5 signature on an incoming PayHere payment notification.
 * Returns false if credentials are not configured (safe fail).
 */
export function verifyNotificationHash(body: PayhereNotificationBody): boolean {
  if (!env.PAYHERE_MERCHANT_SECRET) {
    logger.warn('PAYHERE_MERCHANT_SECRET not set — skipping notification hash verification');
    return false;
  }
  const secretHash = md5upper(env.PAYHERE_MERCHANT_SECRET);
  const expected = md5upper(
    `${body.merchant_id}${body.order_id}${body.payhere_amount}${body.payhere_currency}${body.status_code}${secretHash}`,
  );
  return expected === body.md5sig?.toUpperCase();
}
