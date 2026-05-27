import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';

import { env } from './config/env';
import { logger } from './utils/logger';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';

import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { brandsRouter } from './modules/brands/brands.routes';
import { appointmentsRouter } from './modules/appointments/appointments.routes';
import { bikesRouter } from './modules/bikes/bikes.routes';
import { shopsRouter } from './modules/shops/shops.routes';
import { partsRouter } from './modules/parts/parts.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { reviewsRouter } from './modules/reviews/reviews.routes';
import { webhooksRouter } from './modules/webhooks/webhooks.routes';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // ─── Security ─────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // server-to-server / curl
        if (env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) {
          return cb(null, true);
        }
        return cb(new Error(`CORS: origin ${origin} is not allowed`));
      },
      credentials: true,
      maxAge: 600,
    }),
  );

  // ─── Body parsing & logging ───────────────────────────────────────────────
  // express.urlencoded() is required here (before route mounting) because the
  // PayHere webhook sends payment notifications as URL-encoded form data.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression());
  app.use(
    morgan(env.isProduction ? 'combined' : 'dev', {
      stream: { write: (msg) => logger.info(msg.trim()) },
      skip: (req) => req.path === `${env.API_PREFIX}/health`,
    }),
  );

  // ─── Health check (no rate limit, for load balancers) ─────────────────────
  app.get(`${env.API_PREFIX}/health`, (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'oldtrailbikes-api',
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── API routes (rate-limited) ────────────────────────────────────────────
  const api = express.Router();
  api.use(apiLimiter);

  api.use('/auth', authRouter);
  api.use('/users', usersRouter);
  api.use('/brands', brandsRouter);
  api.use('/appointments', appointmentsRouter);
  api.use('/bikes', bikesRouter);
  api.use('/shops', shopsRouter);
  api.use('/parts', partsRouter);
  api.use('/orders', ordersRouter);
  api.use('/reviews', reviewsRouter);
  api.use('/webhooks', webhooksRouter);

  app.use(env.API_PREFIX, api);

  // ─── 404 + error handlers (always last) ───────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
