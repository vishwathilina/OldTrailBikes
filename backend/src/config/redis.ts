import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (client) return client;

  client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('connect', () => logger.info('Redis: connecting…'));
  client.on('ready', () => logger.info('Redis: ready'));
  client.on('error', (err) => logger.error({ err }, 'Redis error'));
  client.on('close', () => logger.warn('Redis: connection closed'));

  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}
