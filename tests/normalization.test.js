import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReviewCount, parsePrice, parseRating, normalizeProductName, normalizeListing, normalizeKeywords } from '../lib/normalization.js';

test('plain and comma formats', () => {
  assert.equal(parseReviewCount('1,250 reviews'), 1250);
  assert.equal(parseReviewCount(1250), 1250);
  assert.equal(parseReviewCount('0 reviews'), 0);
});
test('K / M suffixes', () => {
  assert.equal(parseReviewCount('1.2K'), 1200);
  assert.equal(parseReviewCount('12.5K'), 12500);
  assert.equal(parseReviewCount('1.5M'), 1500000);
  assert.equal(parseReviewCount('3 million'), 3000000);
});
test('Indian numbering formats', () => {
  assert.equal(parseReviewCount('2,34,567'), 234567);
  assert.equal(parseReviewCount('2.3 lakh'), 230000);
  assert.equal(parseReviewCount('1.2 Lakh ratings'), 120000);
  assert.equal(parseReviewCount('1.5 crore'), 15000000);
});
test('approximate "250+" parses to 250', () => assert.equal(parseReviewCount('250+'), 250));
test('missing / invalid values become null', () => {
  for (const v of [null, undefined, '', '   ', 'n/a', 'No reviews', {}, -5, NaN]) assert.equal(parseReviewCount(v), null, String(v));
});
test('price and rating parsing', () => {
  assert.equal(parsePrice('₹1,29,999.00'), 129999);
  assert.equal(parsePrice('$1,199'), 1199);
  assert.equal(parsePrice('free'), null);
  assert.equal(parseRating('4.55'), 4.6);
  assert.equal(parseRating(7), null);
});
test('product-name normalization removes storage, colours, parenthetical specs', () => {
  const k = 'samsung galaxy s26 ultra';
  assert.equal(normalizeProductName('SAMSUNG Galaxy S26 Ultra 5G (Titanium Black, 256 GB)'), k);
  assert.equal(normalizeProductName('Samsung Galaxy S26 Ultra 256GB Titanium Black'), k);
  assert.equal(normalizeProductName('Nothing Phone (3) (Black, 256 GB)'), 'nothing phone 3');
  assert.equal(normalizeProductName('OnePlus 15 5G 12GB+256GB'), 'oneplus 15');
  assert.equal(normalizeProductName('Redmi Note 15 Pro+ 5G (Midnight Black, 8GB, 256GB)'), 'redmi note 15 pro plus');
  assert.notEqual(normalizeProductName('Apple iPhone 17 Pro Max'), normalizeProductName('Apple iPhone 17'));
});
test('keywords ignore noise words', () => {
  assert.deepEqual(normalizeKeywords('iPhone 17 Pro Max'), ['iphone', '17', 'pro', 'max']);
  assert.deepEqual(normalizeKeywords('smartphone'), []);
});
test('normalizeListing ignores seller rating fields and rejects bad rows', () => {
  const l = normalizeListing({ title: 'Apple iPhone 17 256GB', price: '₹82,900', originalPrice: 90000, rating: '4.5', reviewsText: '2.3K', sellerRating: 4.9, ratingCount: '999999' }, 'croma');
  assert.equal(l.reviewCount, 2300);
  assert.equal(l.discountPct, 8);
  assert.equal(l.url, null);
  assert.equal(normalizeListing({ title: '' }, 'croma'), null);
  assert.equal(normalizeListing(null, 'croma'), null);
  assert.equal(normalizeListing({ title: 'X', url: 'javascript:alert(1)' }, 'croma')?.url ?? null, null);
});
