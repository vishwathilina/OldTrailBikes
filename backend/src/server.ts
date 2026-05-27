import http from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { disconnectPrisma, prisma } from './config/db';
import { disconnectRedis, getRedis } from './config/redis';

async function bootstrap(): Promise<void> {
  // Eager connection sanity check
  await prisma.$queryRaw`SELECT 1`;
  logger.info('PostgreSQL: connected');

  if (env.REDIS_URL) {
    getRedis(); // initialise; ioredis logs its own ready/error events
  } else {
    logger.warn('REDIS_URL not set — caching layer is disabled');
  }

  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    logger.warn(
      'Cloudinary env incomplete (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) — listing/appointment photo uploads will fail until configured',
    );
  }

  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(
      `🚀 OldTrailBikes API listening on http://localhost:${env.PORT}${env.API_PREFIX}  (${env.NODE_ENV})`,
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.warn(`Received ${signal}, shutting down…`);
    server.close(() => logger.info('HTTP server closed'));
    await disconnectPrisma();
    await disconnectRedis();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
