import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfig } from '../lib/config.js';
import { mapAll } from '../lib/mapping.js';
import { assertSafeUrl } from '../lib/safeUrl.js';
import { validateCredentials } from '../lib/validation.js';
import { runSearch, testConnection } from '../services/marketplaceService.js';
import { resetUsage } from '../lib/usage.js';
import { resetRateLimit } from '../lib/rateLimit.js';
import { POST as searchPOST } from '../app/api/search/route.js';
import { POST as connectPOST } from '../app/api/connect/route.js';

const cfg = (o = {}) => ({ ...getConfig({}), ...o });
const base = { mode: 'live', country: 'IN', top: 10, sort: 'reviews', markets: ['flipkart', 'amazon-in', 'croma'], minPrice: null, maxPrice: null, minRating: null };
const json = (data, status = 200) => ({ ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data) });

test('generic mapper handles Flipkart-, eBay- and feed-shaped records and ignores rating counts', () => {
  const fk = mapAll({ productInfoList: [{ productBaseInfoV1: { title: 'Phone A', flipkartSpecialPrice: { amount: 999 }, maximumRetailPrice: { amount: 1299 }, productUrl: 'https://www.flipkart.com/a', imageUrls: { '200x200': 'https://img/a.jpg' } } }] }, 'INR');
  assert.deepEqual([fk[0].title, fk[0].price, fk[0].originalPrice, fk[0].reviewCount, fk[0].image], ['Phone A', 999, 1299, undefined, 'https://img/a.jpg']);
  const eb = mapAll({ itemSummaries: [{ title: 'Phone B', price: { value: '450.00', currency: 'USD' }, itemWebUrl: 'https://ebay.com/b' }] }, 'USD');
  assert.equal(eb[0].price, '450.00');
  const feed = mapAll([{ name: 'Phone C', salePrice: 10, numReviews: '1.2K', ratingCount: 99999, sellerRating: 5 }], 'USD');
  assert.equal(feed[0].reviewCount, '1.2K');
  assert.equal(JSON.stringify(feed[0]).includes('99999'), false);
  assert.deepEqual(mapAll({ nothing: 1 }, 'USD'), []);
});

test('SSRF guard rejects unsafe feed URLs', () => {
  for (const u of ['http://example.com/x', 'https://localhost/x', 'https://127.0.0.1/x', 'https://10.0.0.5/x', 'https://192.168.1.1/x', 'https://169.254.169.254/latest', 'https://user:pw@example.com/x', 'https://intranet/x', 'https://printer.local/x', 'ftp://example.com', 'not a url'])
    assert.throws(() => assertSafeUrl(u), (e) => e.code === 'BAD_URL', u);
  assert.equal(assertSafeUrl('https://feeds.example.com/search?q=x').hostname, 'feeds.example.com');
});

test('credential validation keeps only known fields and rejects bad input', () => {
  const r = validateCredentials({ flipkart: { affiliateId: ' id ', affiliateToken: 'tok', evil: 'x' }, ebay: { appId: '' } });
  assert.deepEqual(r.value, { flipkart: { affiliateId: 'id', affiliateToken: 'tok' } });
  assert.equal(validateCredentials({ nope: { apiKey: 'x' } }).ok, false);
  assert.equal(validateCredentials({ flipkart: { affiliateId: 5 } }).ok, false);
  assert.equal(validateCredentials({ flipkart: { affiliateId: 'x'.repeat(501) } }).ok, false);
  assert.equal(validateCredentials([]).ok, false);
  assert.deepEqual(validateCredentials(undefined).value, {});
});

test('pasting a key enables Live Mode for that marketplace only (no env flag needed)', async () => {
  resetUsage();
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url: String(url), headers: opts.headers });
    if (String(url).includes('flipkart')) return json({ productInfoList: [{ productBaseInfoV1: { title: 'Phone A 128GB', flipkartSpecialPrice: { amount: 999 }, productUrl: 'https://www.flipkart.com/a' } }] });
    return json([{ title: 'Phone A', price: 1100, rating: 4.4, reviewCount: '2.3 lakh', url: 'https://croma.example/a' }]);
  };
  const credentials = { flipkart: { affiliateId: 'AFF1', affiliateToken: 'TOK1' }, croma: { feedUrl: 'https://feeds.example.com/s?q={query}', apiKey: 'K1' } };
  const r = await runSearch({ ...base, q: 'phone a', credentials }, { config: cfg(), fetchImpl });
  const st = Object.fromEntries(r.marketplaces.map((m) => [m.id, m.status]));
  assert.deepEqual(st, { flipkart: 'ok', 'amazon-in': 'unavailable', croma: 'ok' });
  assert.match(r.marketplaces.find((m) => m.id === 'amazon-in').message, /Not connected/);
  assert.equal(r.products[0].reviewCount, 230000);
  const fk = calls.find((c) => c.url.includes('flipkart'));
  assert.equal(fk.headers['Fk-Affiliate-Id'], 'AFF1');
  assert.equal(fk.headers['Fk-Affiliate-Token'], 'TOK1');
  assert.equal(calls.find((c) => c.url.includes('feeds.example.com')).headers.Authorization, 'Bearer K1');
  assert.equal(JSON.stringify(r).includes('TOK1'), false, 'credentials must never appear in the response');
});

test('products without review counts (e.g. Flipkart affiliate data) are listed but not ranked', async () => {
  const fetchImpl = async () => json({ productInfoList: [{ productBaseInfoV1: { title: 'Phone Z', flipkartSpecialPrice: { amount: 500 } } }] });
  const r = await runSearch({ ...base, markets: ['flipkart'], q: 'phone z', credentials: { flipkart: { affiliateId: 'a', affiliateToken: 'b' } } }, { config: cfg(), fetchImpl });
  assert.equal(r.products.length, 0);
  assert.equal(r.unranked.length, 1);
});

test('Live Mode still refused with no keys and no env flag', async () => {
  await assert.rejects(() => runSearch({ ...base, q: 'phone', credentials: {} }, { config: cfg() }), (e) => e.code === 'LIVE_DISABLED');
});

test('testConnection reports success, auth failure and never leaks the secret', async () => {
  const ok = await testConnection('best-buy', { apiKey: 'SECRETKEY123' }, { config: cfg(), fetchImpl: async () => json({ products: [{ name: 'TV', salePrice: 1, customerReviewCount: 10 }] }) });
  assert.equal(ok.ok, true); assert.equal(ok.withReviewCounts, 1);
  const bad = await testConnection('best-buy', { apiKey: 'SECRETKEY123' }, { config: cfg(), fetchImpl: async () => json({}, 403) });
  assert.equal(bad.ok, false); assert.equal(bad.code, 'AUTH');
  const boom = await testConnection('flipkart', { affiliateId: 'a', affiliateToken: 'SECRETTOKEN' }, { config: cfg(), fetchImpl: async () => { throw new Error('connect failed token=SECRETTOKEN'); } });
  assert.equal(boom.ok, false); assert.equal(JSON.stringify(boom).includes('SECRETTOKEN'), false);
  const noReviews = await testConnection('ebay', { appId: 'a', certId: 'b' }, { config: cfg(), fetchImpl: async (u) => (String(u).includes('oauth2') ? json({ access_token: 't' }) : json({ itemSummaries: [{ title: 'X', price: { value: '5' } }] })) });
  assert.equal(noReviews.ok, true); assert.match(noReviews.message, /none include review counts/);
});

test('API routes: POST search with keys (stubbed network) and connect endpoint', async () => {
  resetRateLimit(); resetUsage();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => json([{ title: 'Phone Q', price: 10, reviewCount: 77 }]);
  try {
    const mk = (path, body) => new Request(`http://x${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
    const res = await searchPOST(mk('/api/search', { q: 'phone q', mode: 'live', country: 'IN', markets: ['croma'], credentials: { croma: { feedUrl: 'https://feeds.example.com/s?q={query}', apiKey: 'ROUTESECRET' } } }));
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(data.products[0].reviewCount, 77);
    assert.equal(JSON.stringify(data).includes('ROUTESECRET'), false);
    const c = await (await connectPOST(mk('/api/connect', { marketId: 'croma', credentials: { feedUrl: 'https://feeds.example.com/s?q={query}' } }))).json();
    assert.equal(c.ok, true);
    const missing = await connectPOST(mk('/api/connect', { marketId: 'flipkart', credentials: { affiliateId: 'a' } }));
    assert.equal(missing.status, 400);
    const unsafe = await searchPOST(mk('/api/search', { q: 'phone q', mode: 'live', markets: ['croma'], credentials: { croma: { feedUrl: 'http://127.0.0.1/x' } } }));
    const ud = await unsafe.json();
    assert.equal(ud.marketplaces.find((m) => m.id === 'croma').status, 'error');
    const none = await searchPOST(mk('/api/search', { q: 'phone q', mode: 'live' }));
    assert.equal(none.status, 403);
  } finally { globalThis.fetch = realFetch; }
});
