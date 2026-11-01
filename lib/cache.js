import { getConfig } from './config.js';
import { isRedisConfigured, redisCommand } from './redis.js';

const memory = new Map(); // key -> { value, expires }
const MAX_ENTRIES = 200;

export async function cacheGet(key, config = getConfig()) {
  if (isRedisConfigured(config)) {
    try {
      const raw = await redisCommand(config, ['GET', key]);
      if (raw) return JSON.parse(raw);
    } catch { /* fall through to memory: Redis is optional */ }
  }
  const e = memory.get(key);
  if (!e) return null;
  if (e.expires < Date.now()) { memory.delete(key); return null; }
  return e.value;
}

export async function cacheSet(key, value, ttlSeconds, config = getConfig()) {
  const ttl = ttlSeconds ?? config.cacheTtlSeconds;
  if (memory.size >= MAX_ENTRIES) memory.delete(memory.keys().next().value);
  memory.set(key, { value, expires: Date.now() + ttl * 1000 });
  if (isRedisConfigured(config)) {
    try { await redisCommand(config, ['SET', key, JSON.stringify(value), 'EX', ttl]); } catch { /* ignore */ }
  }
}

export async function cached(key, ttl, producer, config = getConfig()) {
  const hit = await cacheGet(key, config);
  if (hit !== null) return { value: hit, cached: true };
  const value = await producer();
  await cacheSet(key, value, ttl, config);
  return { value, cached: false };
}
export const clearMemoryCache = () => memory.clear();
