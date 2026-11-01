const nullsLast = (get, dir) => (a, b) => {
  const x = get(a), y = get(b);
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  return dir === 'asc' ? x - y : y - x;
};

export const compareReviewsDesc = nullsLast((p) => p.reviewCount, 'desc');

/** Products with a valid review count are ranked strictly descending; the rest are returned separately. */
export function partitionByReviews(products) {
  const ranked = products.filter((p) => p.reviewCount != null)
    .sort((a, b) => compareReviewsDesc(a, b) || a.name.localeCompare(b.name));
  return { ranked, unranked: products.filter((p) => p.reviewCount == null) };
}

export function rankByReviews(products, n) {
  const { ranked, unranked } = partitionByReviews(products);
  return { top: ranked.slice(0, n), unranked, totalRanked: ranked.length };
}

export function sortProducts(products, key = 'reviews') {
  const byReviews = compareReviewsDesc;
  const cmp = {
    reviews: byReviews,
    rating: (a, b) => nullsLast((p) => p.rating, 'desc')(a, b) || byReviews(a, b),
    'price-asc': (a, b) => nullsLast((p) => p.price, 'asc')(a, b) || byReviews(a, b),
    'price-desc': (a, b) => nullsLast((p) => p.price, 'desc')(a, b) || byReviews(a, b),
  }[key] ?? byReviews;
  return [...products].sort(cmp);
}

export function applyFilters(products, { minPrice, maxPrice, minRating } = {}) {
  return products.filter((p) => {
    if ((minPrice != null || maxPrice != null) && p.price == null) return false;
    if (minPrice != null && p.price < minPrice) return false;
    if (maxPrice != null && p.price > maxPrice) return false;
    if (minRating != null && (p.rating == null || p.rating < minRating)) return false;
    return true;
  });
}
