import { getConfig } from '../../../lib/config.js';
import { validateSearchParams } from '../../../lib/validation.js';
import { AppError, errorResponse } from '../../../lib/errorHandler.js';
import { checkRateLimit } from '../../../lib/rateLimit.js';
import { cacheGet, cacheSet } from '../../../lib/cache.js';
import { runSearch } from '../../../services/marketplaceService.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const config = getConfig();
    const ip = (request.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
    const rl = checkRateLimit(ip, config.rateLimitPerMinute);
    if (!rl.ok) return errorResponse(new AppError(429, 'RATE_LIMITED', `Too many requests. Try again in ${rl.retryAfter}s.`), { 'Retry-After': String(rl.retryAfter) });

    const parsed = validateSearchParams(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.ok) throw new AppError(400, 'VALIDATION', parsed.errors.join(' '));
    const p = parsed.value;
    if (p.mode === 'live' && !config.liveModeEnabled) throw new AppError(403, 'LIVE_DISABLED', 'Live Mode is disabled on this deployment. Demo Mode works without any setup.');

    const key = `search:${p.mode}:${p.country}:${p.q.toLowerCase()}:${[...p.markets].sort()}:${p.top}:${p.sort}:${p.minPrice ?? ''}:${p.maxPrice ?? ''}:${p.minRating ?? ''}`;
    const hit = await cacheGet(key, config);
    if (hit) return Response.json({ ...hit, cached: true });

    const result = await runSearch(p, { config });
    await cacheSet(key, result, config.cacheTtlSeconds, config);
    return Response.json({ ...result, cached: false });
  } catch (err) {
    return errorResponse(err);
  }
}
