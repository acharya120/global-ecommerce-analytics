import { MARKETPLACES } from '../lib/marketplaces.js';
import { getConfig } from '../lib/config.js';
import { AppError, withTimeout, sanitizeMessage } from '../lib/errorHandler.js';
import { normalizeKeywords, normalizeListing, normalizeProductName } from '../lib/normalization.js';
import { groupListings } from '../lib/aggregation.js';
import { applyFilters, rankByReviews, sortProducts } from '../lib/sorting.js';
import { DEMO_LISTINGS, DEMO_REVIEWS } from '../data/demoProducts.js';
import { getInsights } from './reviewAnalyticsService.js';
import amazonIndia from './adapters/amazonIndia.js';
import flipkart from './adapters/flipkart.js';
import myntra from './adapters/myntra.js';
import ajio from './adapters/ajio.js';
import croma from './adapters/croma.js';
import relianceDigital from './adapters/relianceDigital.js';
import amazonUS from './adapters/amazonUS.js';
import ebay from './adapters/ebay.js';
import walmart from './adapters/walmart.js';
import bestBuy from './adapters/bestBuy.js';

export const ADAPTERS = Object.fromEntries([amazonIndia, flipkart, myntra, ajio, croma, relianceDigital, amazonUS, ebay, walmart, bestBuy].map((a) => [a.id, a]));

const matches = (tokens, listing) => {
  if (!tokens.length) return true;
  const set = new Set(normalizeProductName(listing.title).split(' '));
  return tokens.every((t) => set.has(t));
};

async function searchOne(market, ctx) {
  const { demo, tokens, config, adapters, fetchImpl, query } = ctx;
  if (demo) {
    if (!market.demoCatalog) throw new AppError(503, 'UNAVAILABLE', 'No demo catalogue for this marketplace (it does not sell electronics or has no sample data).');
    return DEMO_LISTINGS.filter((l) => l.marketplaceId === market.id && matches(tokens, l));
  }
  const adapter = adapters[market.id];
  if (!adapter) throw new AppError(503, 'UNAVAILABLE', 'No adapter registered for this marketplace.');
  return withTimeout((signal) => adapter.search({ query, tokens, config, fetchImpl, signal }), config.requestTimeoutMs, market.name);
}

const statusOf = (err) => (err?.code === 'UNAVAILABLE' ? 'unavailable' : err?.code === 'TIMEOUT' ? 'timeout' : err?.code === 'LIMIT' ? 'limit' : 'error');

/** Core search pipeline. `deps` allows tests to inject adapters/config/fetch. */
export async function runSearch(params, deps = {}) {
  const config = deps.config ?? getConfig();
  const adapters = deps.adapters ?? ADAPTERS;
  const demo = params.mode === 'demo';
  if (!demo && !config.liveModeEnabled) throw new AppError(403, 'LIVE_DISABLED', 'Live Mode is disabled. Set LIVE_MODE_ENABLED=true on the server to enable it.');

  const targets = MARKETPLACES.filter((m) => params.markets.includes(m.id));
  const tokens = normalizeKeywords(params.q);
  const started = Date.now();
  const ctx = { demo, tokens, config, adapters, fetchImpl: deps.fetchImpl, query: params.q };

  const settled = await Promise.allSettled(targets.map(async (m) => {
    const t0 = Date.now();
    const raw = await searchOne(m, ctx);
    return { raw, ms: Date.now() - t0 };
  }));

  const listings = [];
  const marketplaces = settled.map((r, i) => {
    const m = targets[i];
    if (r.status === 'fulfilled') {
      const items = (Array.isArray(r.value.raw) ? r.value.raw : []).map((x) => normalizeListing(x, m.id, { isDemo: demo })).filter(Boolean);
      listings.push(...items);
      return { id: m.id, name: m.name, status: 'ok', count: items.length, ms: r.value.ms, message: items.length ? null : 'No matching products.' };
    }
    return { id: m.id, name: m.name, status: statusOf(r.reason), count: 0, ms: null, message: sanitizeMessage(r.reason?.message) };
  });

  const products = applyFilters(groupListings(listings), params);
  const { top, unranked, totalRanked } = rankByReviews(products, params.top);
  const ordered = sortProducts(top, params.sort);
  const withInsights = await Promise.all(ordered.map(async ({ reviewTexts, ...p }, i) => {
    const texts = demo ? (DEMO_REVIEWS[p.key] ?? []) : reviewTexts;
    return { ...p, rank: i + 1, insights: await getInsights({ key: p.key, texts, config, fetchImpl: deps.fetchImpl }) };
  }));

  return {
    query: params.q, mode: params.mode, country: params.country, top: params.top, sort: params.sort,
    isDemo: demo,
    notice: demo ? 'DEMO DATA — sample listings for demonstration. Not real marketplace information.' : 'Live data from the marketplaces marked "ok". Marketplaces without an authorised data source are shown as unavailable.',
    products: withInsights,
    unranked: unranked.map(({ reviewTexts, ...p }) => p),
    totals: { productsFound: products.length, ranked: totalRanked, marketplacesSearched: targets.length, marketplacesOk: marketplaces.filter((m) => m.status === 'ok').length },
    marketplaces,
    tookMs: Date.now() - started,
    generatedAt: new Date().toISOString(),
  };
}
