// Parsing + normalization helpers. Pure functions, no dependencies.
const MULT = {
  k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6, b: 1e9, billion: 1e9,
  lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, l: 1e5, crore: 1e7, crores: 1e7, cr: 1e7,
};
const COUNT_RE = /(\d[\d,]*(?:\.\d+)?|\.\d+)\s*(thousand|million|billion|lakhs?|lacs?|crores?|mn|cr|k|m|b|l)?(?![a-z])/;

/** "1.2K" -> 1200, "2,34,567" -> 234567, "2.3 lakh" -> 230000, "250+" -> 250, missing -> null */
export function parseReviewCount(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) && input >= 0 ? Math.round(input) : null;
  if (typeof input !== 'string') return null;
  const s = input.toLowerCase().replace(/\u00a0/g, ' ').trim();
  if (!s) return null;
  const m = s.match(COUNT_RE);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * (m[2] ? MULT[m[2]] : 1));
}

export function parsePrice(input) {
  if (typeof input === 'number') return Number.isFinite(input) && input >= 0 ? input : null;
  if (typeof input !== 'string') return null;
  const n = parseFloat(input.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseRating(input) {
  const n = typeof input === 'number' ? input : typeof input === 'string' ? parseFloat(input) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 5 ? Math.round(n * 10) / 10 : null;
}

export function discountPct(price, original) {
  return price != null && original != null && original > price && original > 0
    ? Math.round((1 - price / original) * 100)
    : null;
}

const COLORS = 'black white blue red green gold silver gray grey pink purple violet orange titanium obsidian cosmic lavender midnight sand storm natural desert starlight graphite teal mist'.split(' ');
const NOISE = new Set(['5g', '4g', 'smartphone', 'smartphones', 'phones', 'mobile', 'mobiles', 'unlocked', 'dual', 'sim', 'new', 'with']);
const STORAGE = /\b\d+\s?(?:gb|tb)\b(?:\s?(?:ram|rom))?/g;
const hasSpec = (txt) => /\b\d+\s?(?:gb|tb)\b|\bram\b/.test(txt) || COLORS.some((c) => new RegExp(`\\b${c}\\b`).test(txt));

/** Canonical key used for duplicate detection: "SAMSUNG Galaxy S26 Ultra 5G (Titanium Black, 256 GB)" -> "samsung galaxy s26 ultra" */
export function normalizeProductName(title) {
  let s = String(title ?? '').toLowerCase().replace(/[″”"]/g, ' ');
  s = s.split(/[:,]/)[0];
  s = s.replace(/\(([^)]*)\)/g, (full, inner) => (hasSpec(inner) ? ' ' : ` ${inner} `));
  s = s.replace(STORAGE, ' ');
  s = s.replace(new RegExp(`\\b(?:${COLORS.join('|')})\\b`, 'g'), ' ');
  s = s.replace(/(\w)\+(?=\s|$)/g, '$1 plus ').replace(/\s\+/g, ' ');
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  return s.split(/\s+/).filter((t) => t && !NOISE.has(t)).join(' ');
}

export function normalizeKeywords(q) {
  return normalizeProductName(q).split(' ').filter(Boolean);
}

const BRANDS = { apple: 'Apple', samsung: 'Samsung', oneplus: 'OnePlus', google: 'Google', vivo: 'Vivo', xiaomi: 'Xiaomi', redmi: 'Redmi', nothing: 'Nothing', motorola: 'Motorola', realme: 'Realme', oppo: 'Oppo', iqoo: 'iQOO', poco: 'POCO' };
export const detectBrand = (key) => BRANDS[key.split(' ')[0]] ?? '';

/** Human-friendly display name: removes storage/colour specs but keeps model words. */
export function displayName(title) {
  let s = String(title ?? '');
  s = s.replace(/\(([^)]*)\)/g, (full, inner) => (hasSpec(inner.toLowerCase()) ? ' ' : full));
  s = s.split(/[:,]/)[0];
  s = s.replace(/\b\d+\s?(?:GB|TB)\b/gi, ' ').replace(new RegExp(`\\b(?:${COLORS.join('|')})\\b`, 'gi'), ' ');
  s = s.replace(/\s\+(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  return s || String(title ?? '').trim();
}

export function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/** Convert a raw marketplace record to the internal listing shape. Returns null if unusable. */
export function normalizeListing(raw, marketplaceId, { isDemo = false } = {}) {
  if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) return null;
  const nameKey = normalizeProductName(raw.title);
  if (!nameKey) return null;
  const price = parsePrice(raw.price);
  const originalPrice = parsePrice(raw.originalPrice);
  // Only PRODUCT review counts are used. ratingCount / sellerRating / seller feedback are deliberately ignored.
  const reviewCount = parseReviewCount(raw.reviewCount ?? raw.reviewsText);
  return {
    id: `${marketplaceId}:${hashString(`${raw.title}|${raw.sellerName ?? ''}|${price}`)}`,
    marketplaceId,
    title: raw.title.trim(),
    nameKey,
    brand: detectBrand(nameKey),
    price,
    originalPrice: originalPrice != null && price != null && originalPrice > price ? originalPrice : null,
    discountPct: discountPct(price, originalPrice),
    currency: raw.currency || 'INR',
    rating: parseRating(raw.rating),
    reviewCount,
    reviewPopulationId: raw.reviewPopulationId || null,
    sellerName: raw.sellerName || null,
    url: typeof raw.url === 'string' && /^https:\/\//.test(raw.url) ? raw.url : null,
    image: typeof raw.image === 'string' && /^https:\/\//.test(raw.image) ? raw.image : null,
    reviews: Array.isArray(raw.reviews) ? raw.reviews.filter((r) => typeof r === 'string').slice(0, 100) : [],
    isDemo,
  };
}
