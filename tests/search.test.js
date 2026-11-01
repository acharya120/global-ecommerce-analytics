import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfig } from '../lib/config.js';
import { validateSearchParams } from '../lib/validation.js';
import { runSearch } from '../services/marketplaceService.js';
import { analyzeReviews } from '../services/reviewAnalyticsService.js';
import { DEMO_LISTINGS } from '../data/demoProducts.js';
import { AppError } from '../lib/errorHandler.js';
import { checkRateLimit, resetRateLimit } from '../lib/rateLimit.js';

const base = { mode: 'demo', country: 'IN', top: 10, sort: 'reviews', markets: ['amazon-in', 'flipkart', 'croma', 'reliance-digital'], minPrice: null, maxPrice: null, minRating: null };
const cfg = (over = {}) => ({ ...getConfig({}), ...over });

test('defaults are cost-safe: live, paid providers and AI are all off', () => {
  const c = getConfig({});
  assert.equal(c.liveModeEnabled, false);
  assert.equal(c.paidProvidersEnabled, false);
  assert.equal(c.aiEnabled, false);
  assert.equal(c.cacheTtlSeconds, 1800);
  assert.equal(getConfig({ AI_ENABLED: 'true' }).aiEnabled, false, 'AI needs a key as well');
});

test('demo data meets the brief: >=30 listings, >=6 marketplaces', () => {
  assert.ok(DEMO_LISTINGS.length >= 30);
  assert.ok(new Set(DEMO_LISTINGS.map((l) => l.marketplaceId)).size >= 6);
});

test('Demo Mode works with no credentials and ranks by review volume', async () => {
  const r = await runSearch({ ...base, q: 'iphone' }, { config: cfg() });
  assert.equal(r.isDemo, true);
  assert.match(r.notice, /DEMO DATA/);
  assert.ok(r.products.length >= 2);
  for (let i = 1; i < r.products.length; i++) assert.ok(r.products[i - 1].reviewCount >= r.products[i].reviewCount);
  assert.equal(r.products[0].name, 'Apple iPhone 17 Pro Max');
  assert.equal(r.products[0].reviewCount, 12500 + 98431 + 1850 + 250); // 12.5K counted once for Amazon India (two listings, one population)
});

test('Top 5 and Top 10 selection', async () => {
  const all = { ...base, q: 'smartphone', markets: ['amazon-in', 'flipkart', 'croma', 'reliance-digital'] };
  assert.ok((await runSearch({ ...all, top: 5 }, { config: cfg() })).products.length <= 5);
  assert.ok((await runSearch({ ...all, top: 10 }, { config: cfg() })).products.length > 5);
});

test('filters apply (price, rating) and missing review counts are reported separately', async () => {
  const r = await runSearch({ ...base, q: 'smartphone', maxPrice: 40000 }, { config: cfg() });
  assert.ok(r.products.length > 0 && r.products.every((p) => p.price <= 40000));
  const r2 = await runSearch({ ...base, q: 'smartphone', minRating: 4.5 }, { config: cfg() });
  assert.ok(r2.products.every((p) => p.rating >= 4.5));
  const onlyReliance = await runSearch({ ...base, q: 'oneplus 15', markets: ['reliance-digital'] }, { config: cfg() });
  assert.equal(onlyReliance.products.length, 0);
  assert.equal(onlyReliance.unranked.length, 1);
});

test('empty result for unknown product is not an error', async () => {
  const r = await runSearch({ ...base, q: 'nokia 3310' }, { config: cfg() });
  assert.equal(r.products.length, 0);
  assert.equal(r.marketplaces.find((m) => m.id === 'flipkart').status, 'ok');
});

test('marketplaces without a demo catalogue report unavailable', async () => {
  const r = await runSearch({ ...base, q: 'iphone', markets: ['myntra', 'flipkart'] }, { config: cfg() });
  assert.equal(r.marketplaces.find((m) => m.id === 'myntra').status, 'unavailable');
  assert.ok(r.products.length > 0);
});

test('Live Mode is refused unless explicitly enabled', async () => {
  await assert.rejects(() => runSearch({ ...base, mode: 'live', q: 'iphone' }, { config: cfg() }), (e) => e instanceof AppError && e.code === 'LIVE_DISABLED');
});

test('one failing / timing-out / unavailable marketplace never blocks the others (Promise.allSettled)', async () => {
  const listing = (title, reviews) => [{ title, price: 100, rating: 4.4, reviewCount: reviews }];
  const adapters = {
    'amazon-in': { async search() { return listing('Phone Alpha 256GB', '5K'); } },
    flipkart: { async search() { throw new Error('boom api_key=SECRET123'); } },
    croma: { async search() { return new Promise(() => {}); } }, // never resolves
    'reliance-digital': { async search() { throw new AppError(503, 'UNAVAILABLE', 'no source'); } },
  };
  const r = await runSearch({ ...base, mode: 'live', q: 'phone alpha' }, { config: cfg({ liveModeEnabled: true, requestTimeoutMs: 50 }), adapters });
  const st = Object.fromEntries(r.marketplaces.map((m) => [m.id, m.status]));
  assert.deepEqual(st, { 'amazon-in': 'ok', flipkart: 'error', croma: 'timeout', 'reliance-digital': 'unavailable' });
  assert.equal(r.products.length, 1);
  assert.equal(r.products[0].reviewCount, 5000);
  assert.doesNotMatch(JSON.stringify(r), /SECRET123/, 'credentials must be redacted');
  assert.equal(r.products[0].insights.sufficient, false, 'no review text => honest insufficient-data message');
});

test('API validation', () => {
  assert.equal(validateSearchParams({ q: '' }).ok, false);
  assert.equal(validateSearchParams({ q: 'a' }).ok, false);
  assert.equal(validateSearchParams({ q: 'x'.repeat(81) }).ok, false);
  assert.equal(validateSearchParams({ q: 'iphone', top: '7' }).ok, false);
  assert.equal(validateSearchParams({ q: 'iphone', mode: 'hack' }).ok, false);
  assert.equal(validateSearchParams({ q: 'iphone', sort: 'random' }).ok, false);
  assert.equal(validateSearchParams({ q: 'iphone', markets: 'evil-shop' }).ok, false);
  assert.equal(validateSearchParams({ q: 'iphone', minPrice: '500', maxPrice: '100' }).ok, false);
  assert.equal(validateSearchParams({ q: 'iphone', minRating: '9' }).ok, false);
  const ok = validateSearchParams({ q: '  <b>iPhone</b>   17 ', top: '5', country: 'us' });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.q, 'b iPhone /b 17');
  assert.equal(ok.value.top, 5);
  assert.deepEqual(ok.value.markets, ['amazon-us', 'ebay', 'walmart', 'best-buy']);
  assert.equal(validateSearchParams({ q: 'iphone', country: 'IN', markets: 'ebay' }).ok, false);
});

test('rate limiter', () => {
  resetRateLimit();
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(checkRateLimit('ip', 3, t).ok, true);
  assert.equal(checkRateLimit('ip', 3, t).ok, false);
  assert.equal(checkRateLimit('ip', 3, t + 61_000).ok, true);
});

test('rule-based analytics: themes, negation, labelling, insufficient data', () => {
  const r = analyzeReviews(['Battery is great and charging is fast.', 'The camera is superb.', 'It heats up while gaming.', 'No heating issues at all, smooth.']);
  assert.equal(r.sufficient, true);
  assert.match(r.label, /not verified AI/);
  assert.ok(r.pros.some((p) => p.theme === 'Battery performance'));
  assert.ok(r.cons.some((c) => c.theme === 'Heating'));
  const few = analyzeReviews(['good']);
  assert.equal(few.sufficient, false);
  assert.match(few.verdict, /Not enough review text/);
  assert.equal(analyzeReviews([]).pros.length, 0);
});
