import { Router } from 'express';
import { payhereWebhook } from './payhere.handler';

/**
 * PayHere sends payment notifications as URL-encoded form data (application/x-www-form-urlencoded).
 * This is parsed by the global express.urlencoded() middleware in app.ts, so no special
 * body-parser setup is needed here (unlike Stripe which requires express.raw()).
 */
export const webhooksRouter = Router();

webhooksRouter.post('/payhere', payhereWebhook);
