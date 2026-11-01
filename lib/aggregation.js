import { displayName, discountPct } from './normalization.js';

/** Remove exact duplicate listings (same marketplace, product, seller, price, url). */
export function dedupeListings(listings) {
  const seen = new Set();
  return listings.filter((l) => {
    const k = [l.marketplaceId, l.nameKey, l.sellerName ?? '', l.price ?? '', l.url ?? ''].join('|');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Sum review counts ONLY across independent review populations.
 * Listings in the same marketplace (variants / different sellers) share one population,
 * so we take the MAX for that population instead of adding.
 */
export function aggregateReviewCounts(offers) {
  const pops = new Map();
  for (const o of offers) {
    if (o.reviewCount == null) continue;
    const pk = o.reviewPopulationId || o.marketplaceId;
    const prev = pops.get(pk);
    if (!prev || o.reviewCount > prev.reviewCount) pops.set(pk, { marketplaceId: o.marketplaceId, reviewCount: o.reviewCount, rating: o.rating });
  }
  if (!pops.size) return { total: null, breakdown: [] };
  const breakdown = [...pops.values()];
  return { total: breakdown.reduce((s, p) => s + p.reviewCount, 0), breakdown };
}

function weightedRating(breakdown, offers) {
  const rated = breakdown.filter((p) => p.rating != null);
  if (rated.length) {
    const w = rated.reduce((s, p) => s + p.reviewCount, 0);
    return w > 0 ? Math.round((rated.reduce((s, p) => s + p.rating * p.reviewCount, 0) / w) * 10) / 10 : null;
  }
  const r = offers.filter((o) => o.rating != null);
  return r.length ? Math.round((r.reduce((s, o) => s + o.rating, 0) / r.length) * 10) / 10 : null;
}

/** Group duplicate listings of the same product across marketplaces into one product with preserved offers. */
export function groupListings(listings) {
  const groups = new Map();
  for (const l of dedupeListings(listings)) {
    if (!groups.has(l.nameKey)) groups.set(l.nameKey, []);
    groups.get(l.nameKey).push(l);
  }
  return [...groups.entries()].map(([key, offers]) => {
    const { total, breakdown } = aggregateReviewCounts(offers);
    const byReviews = [...offers].sort((a, b) => (b.reviewCount ?? -1) - (a.reviewCount ?? -1) || (a.price ?? Infinity) - (b.price ?? Infinity));
    const primary = byReviews[0];
    const priced = offers.filter((o) => o.price != null).sort((a, b) => a.price - b.price);
    const best = priced[0] ?? null;
    return {
      key,
      name: displayName(primary.title),
      brand: primary.brand,
      image: offers.find((o) => o.image)?.image ?? null,
      price: best?.price ?? null,
      originalPrice: best?.originalPrice ?? null,
      discountPct: best ? discountPct(best.price, best.originalPrice) : null,
      currency: (best ?? primary).currency,
      rating: weightedRating(breakdown, offers),
      reviewCount: total,
      reviewBreakdown: breakdown.map(({ marketplaceId, reviewCount }) => ({ marketplaceId, reviewCount })),
      marketplaces: [...new Set(offers.map((o) => o.marketplaceId))],
      offers: [...offers].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
        .map(({ id, marketplaceId, title, price, originalPrice, discountPct: d, currency, rating, reviewCount, sellerName, url }) =>
          ({ id, marketplaceId, title, price, originalPrice, discountPct: d, currency, rating, reviewCount, sellerName, url })),
      reviewTexts: offers.flatMap((o) => o.reviews),
      isDemo: offers.every((o) => o.isDemo),
    };
  });
}
