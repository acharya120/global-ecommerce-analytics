import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeListing } from '../lib/normalization.js';
import { dedupeListings, aggregateReviewCounts, groupListings } from '../lib/aggregation.js';

const L = (market, title, reviews, extra = {}) => normalizeListing({ title, price: 100, rating: 4.5, reviewsText: reviews, ...extra }, market);

test('duplicates across marketplaces are grouped and independent populations are summed', () => {
  const [g] = groupListings([L('amazon-in', 'Apple iPhone 17 256GB', '1,000'), L('flipkart', 'Apple iPhone 17 (Black, 256 GB)', '2,000')]);
  assert.equal(g.reviewCount, 3000);
  assert.equal(g.offers.length, 2);
  assert.deepEqual(g.marketplaces.sort(), ['amazon-in', 'flipkart']);
});
test('same-marketplace variants / sellers share a population: MAX, never SUM', () => {
  const [g] = groupListings([L('amazon-in', 'Apple iPhone 17 256GB', '5K'), L('amazon-in', 'Apple iPhone 17 512GB', '5K', { sellerName: 'Other' }), L('amazon-in', 'Apple iPhone 17 128GB', '4,000', { sellerName: 'Third' })]);
  assert.equal(g.reviewCount, 5000);
  assert.equal(g.offers.length, 3);
});
test('explicit shared reviewPopulationId prevents double counting across marketplaces', () => {
  const r = aggregateReviewCounts([L('a-market', 'Phone X', '900', { reviewPopulationId: 'pop1' }), L('b-market', 'Phone X', '900', { reviewPopulationId: 'pop1' })]);
  assert.equal(r.total, 900);
});
test('missing review counts stay null and are not treated as zero', () => {
  const [g] = groupListings([L('amazon-in', 'Phone Y', null)]);
  assert.equal(g.reviewCount, null);
  const [h] = groupListings([L('amazon-in', 'Phone Z', null), L('flipkart', 'Phone Z', '10')]);
  assert.equal(h.reviewCount, 10);
});
test('exact duplicate listings are removed', () => {
  const a = L('croma', 'Phone Q', '10', { url: 'https://example.com/q' });
  assert.equal(dedupeListings([a, { ...a }]).length, 1);
});
test('best price and weighted rating', () => {
  const [g] = groupListings([L('amazon-in', 'Phone R', '100', { price: 500, rating: 5 }), L('flipkart', 'Phone R', '300', { price: 450, rating: 4 })]);
  assert.equal(g.price, 450);
  assert.equal(g.rating, 4.3); // (5*100 + 4*300) / 400 = 4.25 -> 4.3
});
