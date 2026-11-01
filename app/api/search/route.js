import { getConfig } from '../../../lib/config.js';
import { validateSearchParams, validateCredentials } from '../../../lib/validation.js';
import { AppError, errorResponse } from '../../../lib/errorHandler.js';
import { checkRateLimit } from '../../../lib/rateLimit.js';
import { cacheGet, cacheSet } from '../../../lib/cache.js';
import { runSearch } from '../../../services/marketplaceService.js';

export const dynamic = 'force-dynamic';

async function handle(request, input, rawCredentials) {
  const config = getConfig();
  const ip = (request.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const rl = checkRateLimit(ip, config.rateLimitPerMinute);
  if (!rl.ok) return errorResponse(new AppError(429, 'RATE_LIMITED', `Too many requests. Try again in ${rl.retryAfter}s.`), { 'Retry-After': String(rl.retryAfter) });

  const parsed = validateSearchParams(input);
  if (!parsed.ok) throw new AppError(400, 'VALIDATION', parsed.errors.join(' '));
  const creds = validateCredentials(rawCredentials);
  if (!creds.ok) throw new AppError(400, 'VALIDATION', creds.errors.join(' '));
  const p = { ...parsed.value, credentials: creds.value };
  const hasCreds = Object.keys(creds.value).length > 0;
  if (p.mode === 'live' && !config.liveModeEnabled && !hasCreds) throw new AppError(403, 'LIVE_DISABLED', 'Live Mode needs at least one marketplace API key (paste it in the API connections panel). Demo Mode works without any setup.');

  // Results fetched with someone's own keys are never put in the shared cache.
  const key = `search:${p.mode}:${p.country}:${p.q.toLowerCase()}:${[...p.markets].sort()}:${p.top}:${p.sort}:${p.minPrice ?? ''}:${p.maxPrice ?? ''}:${p.minRating ?? ''}`;
  const cacheable = !hasCreds && p.mode === 'demo';
  if (cacheable) {
    const hit = await cacheGet(key, config);
    if (hit) return Response.json({ ...hit, cached: true });
  }
  const result = await runSearch(p, { config });
  if (cacheable) await cacheSet(key, result, config.cacheTtlSeconds, config);
  return Response.json({ ...result, cached: false }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request) {
  try { return await handle(request, Object.fromEntries(new URL(request.url).searchParams), null); } catch (err) { return errorResponse(err); }
}

// POST carries API keys in the body (never in the URL, so they stay out of access logs).
export async function POST(request) {
  try {
    let body;
    try { body = await request.json(); } catch { throw new AppError(400, 'VALIDATION', 'Body must be JSON.'); }
    const { credentials, ...rest } = body ?? {};
    if (Array.isArray(rest.markets)) rest.markets = rest.markets.join(',');
    return await handle(request, rest, credentials);
  } catch (err) { return errorResponse(err); }
}
