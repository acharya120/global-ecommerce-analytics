// Best Buy Products API — free developer key from developer.bestbuy.com (set BESTBUY_API_KEY).
// NOTE: written against the public API docs; it has not been exercised against the live service from this build environment.
import { AppError } from '../../lib/errorHandler.js';
import { recordUsage, underLimit } from '../../lib/usage.js';

export default {
  id: 'best-buy',
  name: 'Best Buy',
  async search({ tokens, config, fetchImpl = fetch, signal }) {
    const key = config.keys.bestBuy;
    if (!key) throw new AppError(503, 'UNAVAILABLE', 'Set BESTBUY_API_KEY (free key from developer.bestbuy.com) to enable Best Buy.');
    if (!underLimit('best-buy', config.maxApiCallsPerDay)) throw new AppError(429, 'LIMIT', 'Daily API call limit reached for Best Buy.');
    const terms = tokens.map((t) => `search=${encodeURIComponent(t)}`).join('&');
    const show = 'sku,name,salePrice,regularPrice,customerReviewAverage,customerReviewCount,image,url';
    recordUsage('best-buy', { query: tokens.join(' ') });
    const res = await fetchImpl(`https://api.bestbuy.com/v1/products(${terms})?apiKey=${encodeURIComponent(key)}&format=json&pageSize=25&show=${show}`, { signal });
    if (!res.ok) throw new AppError(502, 'UPSTREAM', `Best Buy API returned HTTP ${res.status}`);
    const data = await res.json();
    return (data.products ?? []).map((p) => ({
      title: p.name, price: p.salePrice, originalPrice: p.regularPrice, currency: 'USD',
      rating: p.customerReviewAverage, reviewCount: p.customerReviewCount, url: p.url, image: p.image,
    }));
  },
};
