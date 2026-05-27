import type { Request, Response, NextFunction } from 'express';
import {
  verifyNotificationHash,
  PAYHERE_STATUS,
  type PayhereNotificationBody,
} from '../../services/payhere.service';
import {
  markOrderFailed,
  markOrderPaid,
  markOrderRefunded,
} from '../orders/orders.service';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/db';

/**
 * POST /webhooks/payhere
 *
 * PayHere sends a URL-encoded form POST notification when payment status changes.
 * The handler must:
 *  1. Verify the MD5 signature to ensure the notification is genuine
 *  2. Look up the order by order_id (which is our Order.id)
 *  3. Update order status based on status_code
 *
 * PayHere expects a 200 OK response with no body to acknowledge receipt.
 * Any non-200 triggers a retry (up to ~12 times over 24 h).
 */
export async function payhereWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as PayhereNotificationBody;

    const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = body;

    logger.info(
      { order_id, status_code, merchant_id },
      'PayHere notification received',
    );

    // 1. Verify signature (log and reject if invalid)
    if (!verifyNotificationHash({ merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig })) {
      logger.warn({ order_id }, 'PayHere notification: invalid hash — ignoring');
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // 2. Find the order
    const order = await prisma.order.findUnique({ where: { id: order_id } });
    if (!order) {
      logger.warn({ order_id }, 'PayHere notification: order not found');
      // Return 200 so PayHere doesn't keep retrying for a nonexistent order
      res.sendStatus(200);
      return;
    }

    // 3. Act on status code
    const code = Number(status_code);

    if (code === PAYHERE_STATUS.SUCCESS) {
      if (order.status !== 'PAID') {
        await markOrderPaid(order_id, body.payment_id ?? `payhere:${order_id}`);
        logger.info({ order_id, paymentId: body.payment_id }, 'Order marked as PAID');
      }
    } else if (code === PAYHERE_STATUS.FAILED || code === PAYHERE_STATUS.CANCELLED) {
      if (order.status === 'PENDING') {
        await markOrderFailed(order_id);
        logger.info({ order_id, code }, 'Order marked as FAILED');
      }
    } else if (code === PAYHERE_STATUS.CHARGEDBACK) {
      if (order.status === 'PAID') {
        await markOrderRefunded(order_id);
        logger.info({ order_id }, 'Order marked as REFUNDED (chargeback)');
      }
    } else {
      logger.info({ order_id, code }, 'PayHere notification: unhandled status code (pending?)');
    }

    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
}
