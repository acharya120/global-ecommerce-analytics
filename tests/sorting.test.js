import test from 'node:test';
import assert from 'node:assert/strict';
import { partitionByReviews, rankByReviews, sortProducts, applyFilters } from '../lib/sorting.js';

const P = (name, reviewCount, extra = {}) => ({ name, reviewCount, rating: 4, price: 100, ...extra });
const data = [P('C', 75000), P('A', 125000), P('E', 19000), P('B', 98000), P('D', 42000), P('N', null), P('F', 5)];

test('ranking is strictly descending by review count and computed dynamically', () => {
  const { top } = rankByReviews(data, 5);
  assert.deepEqual(top.map((p) => p.name), ['A', 'B', 'C', 'D', 'E']);
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1].reviewCount >= top[i].reviewCount);
  assert.equal(rankByReviews(data, 10).top.length, 6);
});
test('Top 5 / Top 10 limits', () => {
  const many = Array.from({ length: 20 }, (_, i) => P(`P${i}`, i * 10));
  assert.equal(rankByReviews(many, 5).top.length, 5);
  assert.equal(rankByReviews(many, 10).top.length, 10);
});
test('missing review counts are handled separately', () => {
  const { ranked, unranked } = partitionByReviews(data);
  assert.equal(ranked.length, 6);
  assert.deepEqual(unranked.map((p) => p.name), ['N']);
});
test('ties are deterministic', () => {
  const { ranked } = partitionByReviews([P('b', 10), P('a', 10)]);
  assert.deepEqual(ranked.map((p) => p.name), ['a', 'b']);
});
test('sort modes put nulls last', () => {
  const items = [P('x', 1, { price: 300, rating: 4.1 }), P('y', 2, { price: null, rating: null }), P('z', 3, { price: 100, rating: 4.9 })];
  assert.deepEqual(sortProducts(items, 'price-asc').map((p) => p.name), ['z', 'x', 'y']);
  assert.deepEqual(sortProducts(items, 'price-desc').map((p) => p.name), ['x', 'z', 'y']);
  assert.deepEqual(sortProducts(items, 'rating').map((p) => p.name), ['z', 'x', 'y']);
  assert.deepEqual(sortProducts(items, 'reviews').map((p) => p.name), ['z', 'y', 'x']);
});
test('filters', () => {
  const items = [P('a', 1, { price: 50, rating: 3.9 }), P('b', 1, { price: 150, rating: 4.5 }), P('c', 1, { price: null, rating: null })];
  assert.deepEqual(applyFilters(items, { minPrice: 100 }).map((p) => p.name), ['b']);
  assert.deepEqual(applyFilters(items, { maxPrice: 100 }).map((p) => p.name), ['a']);
  assert.deepEqual(applyFilters(items, { minRating: 4 }).map((p) => p.name), ['b']);
  assert.equal(applyFilters(items, {}).length, 3);
});
