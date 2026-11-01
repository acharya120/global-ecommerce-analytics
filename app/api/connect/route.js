import { getConfig } from '../../../lib/config.js';
import { validateCredentials } from '../../../lib/validation.js';
import { MARKETPLACES, requiredFieldsFilled } from '../../../lib/marketplaces.js';
import { AppError, errorResponse } from '../../../lib/errorHandler.js';
import { checkRateLimit } from '../../../lib/rateLimit.js';
import { testConnection } from '../../../services/marketplaceService.js';

export const dynamic = 'force-dynamic';

// POST { marketId, credentials: { field: value } } -> { ok, message }. Keys are used for this one test and never stored or logged.
export async function POST(request) {
  try {
    const ip = (request.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
    const rl = checkRateLimit(`c:${ip}`, 12);
    if (!rl.ok) throw new AppError(429, 'RATE_LIMITED', `Too many connection tests. Try again in ${rl.retryAfter}s.`);
    let body;
    try { body = await request.json(); } catch { throw new AppError(400, 'VALIDATION', 'Body must be JSON.'); }
    const market = MARKETPLACES.find((m) => m.id === body?.marketId);
    if (!market) throw new AppError(400, 'VALIDATION', 'Unknown marketplace.');
    const creds = validateCredentials({ [market.id]: body?.credentials });
    if (!creds.ok) throw new AppError(400, 'VALIDATION', creds.errors.join(' '));
    const values = creds.value[market.id] ?? {};
    if (!requiredFieldsFilled(market, values)) throw new AppError(400, 'VALIDATION', `Fill in: ${market.fields.filter((f) => f.required).map((f) => f.label).join(', ')}.`);
    const result = await testConnection(market.id, values, { config: getConfig() });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) { return errorResponse(err); }
}
