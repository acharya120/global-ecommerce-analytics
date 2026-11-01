// Best Buy Products API (free developer key). Written from the public docs; NOT verified live from the build environment.
import { AppError } from '../../lib/errorHandler.js';
import { mapAll } from '../../lib/mapping.js';
import { recordUsage, underLimit } from '../../lib/usage.js';

export default {
  id: 'best-buy',
  name: 'Best Buy',
  async search({ tokens, config, fetchImpl = fetch, signal, credentials = {} }) {
    const key = credentials.apiKey || config.keys.bestBuy;
    if (!key) throw new AppError(503, 'UNAVAILABLE', 'Not connected. Paste your Best Buy API key (free at developer.bestbuy.com) in the API connections panel.');
    if (!underLimit('best-buy', config.maxApiCallsPerDay)) throw new AppError(429, 'LIMIT', 'Daily API call limit reached for Best Buy.');
    const terms = tokens.map((t) => `search=${encodeURIComponent(t)}`).join('&');
    recordUsage('best-buy', { query: tokens.join(' ') });
    const res = await fetchImpl(`https://api.bestbuy.com/v1/products(${terms})?apiKey=${encodeURIComponent(key)}&format=json&pageSize=25&show=sku,name,salePrice,regularPrice,customerReviewAverage,customerReviewCount,image,url`, { signal, redirect: 'manual' });
    if (res.status === 403 || res.status === 401) throw new AppError(401, 'AUTH', 'Best Buy rejected the API key.');
    if (!res.ok) throw new AppError(502, 'UPSTREAM', `Best Buy API returned HTTP ${res.status}.`);
    return mapAll(await res.json(), 'USD');
  },
};
