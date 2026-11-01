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
  const credentials = ctx.credentials?.[market.id] ?? {};
  if (!config.liveModeEnabled && !Object.keys(credentials).length) throw new AppError(503, 'UNAVAILABLE', `Not connected. Paste an API key for ${market.name} in the API connections panel.`);
  return withTimeout((signal) => adapter.search({ query, tokens, config, fetchImpl, signal, credentials }), config.requestTimeoutMs, market.name);
}

const statusOf = (err) => (err?.code === 'UNAVAILABLE' ? 'unavailable' : err?.code === 'TIMEOUT' ? 'timeout' : err?.code === 'LIMIT' ? 'limit' : 'error');

/** Core search pipeline. `deps` allows tests to inject adapters/config/fetch. */
export async function runSearch(params, deps = {}) {
  const config = deps.config ?? getConfig();
  const adapters = deps.adapters ?? ADAPTERS;
  const demo = params.mode === 'demo';
  const credentials = params.credentials ?? {};
  if (!demo && !config.liveModeEnabled && !Object.keys(credentials).length) throw new AppError(403, 'LIVE_DISABLED', 'Live Mode needs at least one marketplace API key (paste it in the API connections panel), or LIVE_MODE_ENABLED=true on the server.');

  const targets = MARKETPLACES.filter((m) => params.markets.includes(m.id));
  const tokens = normalizeKeywords(params.q);
  const started = Date.now();
  const ctx = { demo, tokens, config, adapters, fetchImpl: deps.fetchImpl, query: params.q, credentials };

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

/** Auto-connect check used by the API panel: one small test search with the pasted credentials. Never returns or logs the credentials. */
export async function testConnection(marketId, credentials, deps = {}) {
  const config = deps.config ?? getConfig();
  const adapter = (deps.adapters ?? ADAPTERS)[marketId];
  const market = MARKETPLACES.find((m) => m.id === marketId);
  if (!adapter || !market) throw new AppError(400, 'VALIDATION', 'Unknown marketplace.');
  try {
    const raw = await withTimeout((signal) => adapter.search({ query: 'smartphone', tokens: ['smartphone'], config, fetchImpl: deps.fetchImpl, signal, credentials }), config.requestTimeoutMs, market.name);
    const listings = (Array.isArray(raw) ? raw : []).map((x) => normalizeListing(x, marketId)).filter(Boolean);
    const withReviews = listings.filter((l) => l.reviewCount != null).length;
    return { ok: true, count: listings.length, withReviewCounts: withReviews,
      message: `Connected. ${listings.length} product${listings.length === 1 ? '' : 's'} returned for a test search${listings.length && !withReviews ? ', but none include review counts, so they cannot be ranked by reviews' : ''}.` };
  } catch (err) {
    return { ok: false, code: err?.code ?? 'ERROR', message: sanitizeMessage(err?.message) };
  }
}
