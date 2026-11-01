// Minimal Upstash Redis REST client (no dependency). Optional: callers must check isRedisConfigured first.
export function isRedisConfigured(config) {
  return Boolean(config?.redis?.url && config?.redis?.token);
}
export async function redisCommand(config, command, fetchImpl = fetch) {
  if (!isRedisConfigured(config)) throw new Error('Redis not configured');
  const res = await fetchImpl(config.redis.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.redis.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error('Redis command error');
  return data.result;
}
