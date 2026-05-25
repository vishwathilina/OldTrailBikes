import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../utils/logger';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ],
  });

if (env.isDevelopment) {
  // @ts-expect-error event-typed log channels
  prisma.$on('query', (e: { query: string; duration: number }) => {
    logger.debug({ duration: `${e.duration}ms` }, e.query);
  });
}

// @ts-expect-error event-typed log channels
prisma.$on('warn', (e: { message: string }) => logger.warn(e.message));
// @ts-expect-error event-typed log channels
prisma.$on('error', (e: { message: string }) => logger.error(e.message));

if (!env.isProduction) globalForPrisma.prisma = prisma;

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
