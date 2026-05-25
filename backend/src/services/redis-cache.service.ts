import { getRedis } from '../config/redis';
import { logger } from '../utils/logger';

const NS = 'otb:';

const k = (key: string) => `${NS}${key}`;

export async function cacheGet<T>(cacheKey: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(k(cacheKey));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    logger.warn({ err, cacheKey }, 'Cache get failed');
    return null;
  }
}

export async function cacheSet(cacheKey: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(k(cacheKey), JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ err, cacheKey }, 'Cache set failed');
  }
}

export async function cacheDel(...cacheKeys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(...cacheKeys.map(k));
  } catch (err) {
    logger.warn({ err, cacheKeys }, 'Cache del failed');
  }
}

/** Delete all keys matching a glob pattern (use carefully in prod). */
export async function cacheDelPattern(pattern: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const keys = await redis.keys(k(pattern));
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    logger.warn({ err, pattern }, 'Cache del-pattern failed');
  }
}
