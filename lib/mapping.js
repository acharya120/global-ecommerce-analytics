// Tolerant mapping of partner/provider JSON into the raw listing shape. Deliberately never reads seller ratings or rating counts.
const get = (o, path) => path.split('.').reduce((a, p) => (a == null ? undefined : a[p]), o);
const scalar = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v.value ?? v.amount ?? v.price ?? undefined) : v);
const pick = (o, paths) => { for (const p of paths) { const v = scalar(get(o, p)); if (v !== undefined && v !== null && v !== '') return v; } return undefined; };

export function extractArray(json) {
  if (Array.isArray(json)) return json;
  for (const k of ['products', 'items', 'results', 'data', 'productInfoList', 'itemSummaries']) {
    if (Array.isArray(json?.[k])) return json[k];
    if (Array.isArray(json?.[k]?.items)) return json[k].items;
    if (Array.isArray(json?.[k]?.products)) return json[k].products;
  }
  return [];
}

export function mapGeneric(raw, defaultCurrency) {
  const o = raw?.productBaseInfoV1 ?? raw ?? {};
  const imgObj = o.imageUrls && typeof o.imageUrls === 'object' ? Object.values(o.imageUrls)[0] : undefined;
  return {
    title: pick(o, ['title', 'name', 'productName']),
    price: pick(o, ['salePrice', 'flipkartSpecialPrice', 'flipkartSellingPrice', 'sellingPrice', 'currentPrice', 'price']),
    originalPrice: pick(o, ['regularPrice', 'maximumRetailPrice', 'mrp', 'listPrice', 'originalPrice']),
    currency: pick(o, ['currency', 'currencyCode', 'price.currency']) ?? defaultCurrency,
    rating: pick(o, ['rating', 'averageRating', 'customerReviewAverage', 'avgRating']),
    reviewCount: pick(o, ['reviewCount', 'reviewsCount', 'numReviews', 'customerReviewCount', 'totalReviews']),
    url: pick(o, ['url', 'productUrl', 'link', 'itemWebUrl']),
    image: pick(o, ['image', 'imageUrl', 'thumbnail', 'image.imageUrl']) ?? imgObj,
  };
}

export const mapAll = (json, defaultCurrency) => extractArray(json).map((r) => mapGeneric(r, defaultCurrency)).filter((r) => r.title);
