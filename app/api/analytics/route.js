import { getConfig } from '../../../lib/config.js';
import { AppError, errorResponse } from '../../../lib/errorHandler.js';
import { checkRateLimit } from '../../../lib/rateLimit.js';
import { getInsights } from '../../../services/reviewAnalyticsService.js';
import { hashString } from '../../../lib/normalization.js';

export const dynamic = 'force-dynamic';

// POST { reviews: string[] (max 100, each <= 1000 chars) } -> insights. Rule-based unless the owner enabled OpenAI.
export async function POST(request) {
  try {
    const config = getConfig();
    const ip = (request.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
    const rl = checkRateLimit(`a:${ip}`, config.rateLimitPerMinute);
    if (!rl.ok) throw new AppError(429, 'RATE_LIMITED', `Too many requests. Try again in ${rl.retryAfter}s.`);
    let body;
    try { body = await request.json(); } catch { throw new AppError(400, 'VALIDATION', 'Body must be JSON.'); }
    const reviews = body?.reviews;
    if (!Array.isArray(reviews) || reviews.length > 100 || reviews.some((r) => typeof r !== 'string' || r.length > 1000))
      throw new AppError(400, 'VALIDATION', 'reviews must be an array of at most 100 strings (max 1000 characters each).');
    const insights = await getInsights({ key: `adhoc:${hashString(reviews.join('|'))}`, texts: reviews, config });
    return Response.json({ insights });
  } catch (err) {
    return errorResponse(err);
  }
}
