// Fixed-window per-IP limiter (in-memory, best effort on serverless).
const hits = new Map();
export function checkRateLimit(id, limit, now = Date.now()) {
  const windowMs = 60_000;
  const e = hits.get(id);
  if (!e || now - e.start >= windowMs) {
    hits.set(id, { start: now, count: 1 });
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  e.count += 1;
  return e.count <= limit
    ? { ok: true, remaining: limit - e.count, retryAfter: 0 }
    : { ok: false, remaining: 0, retryAfter: Math.ceil((windowMs - (now - e.start)) / 1000) };
}
export const resetRateLimit = () => hits.clear();
