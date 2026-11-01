import { MARKETPLACES, COUNTRIES } from './marketplaces.js';

const SORTS = ['reviews', 'rating', 'price-asc', 'price-desc'];
const optNum = (v, name, errors, { min = 0, max = 1e9 } = {}) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) { errors.push(`${name} must be a number between ${min} and ${max}.`); return null; }
  return n;
};

/** Validate + normalize raw query params. Returns { ok, value } or { ok:false, errors }. */
export function validateSearchParams(input = {}) {
  const errors = [];
  const q = String(input.q ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  if (q.length < 2) errors.push('Search text must be at least 2 characters.');
  if (q.length > 80) errors.push('Search text must be 80 characters or fewer.');

  const mode = input.mode ?? 'demo';
  if (!['demo', 'live'].includes(mode)) errors.push('mode must be "demo" or "live".');

  const country = String(input.country ?? 'IN').toUpperCase();
  if (!COUNTRIES.some((c) => c.code === country)) errors.push('country must be IN or US.');

  const top = Number(input.top ?? 10);
  if (![5, 10].includes(top)) errors.push('top must be 5 or 10.');

  const sort = input.sort ?? 'reviews';
  if (!SORTS.includes(sort)) errors.push(`sort must be one of: ${SORTS.join(', ')}.`);

  const allowed = MARKETPLACES.filter((m) => m.country === country).map((m) => m.id);
  const requested = String(input.markets ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const unknown = requested.filter((id) => !MARKETPLACES.some((m) => m.id === id));
  if (unknown.length) errors.push(`Unknown marketplace: ${unknown.slice(0, 3).join(', ')}.`);
  const markets = requested.length ? requested.filter((id) => allowed.includes(id)) : allowed;
  if (!unknown.length && !markets.length) errors.push('No selected marketplace belongs to the selected country.');

  const minPrice = optNum(input.minPrice, 'minPrice', errors);
  const maxPrice = optNum(input.maxPrice, 'maxPrice', errors);
  const minRating = optNum(input.minRating, 'minRating', errors, { min: 0, max: 5 });
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) errors.push('minPrice cannot exceed maxPrice.');

  return errors.length ? { ok: false, errors } : { ok: true, value: { q, mode, country, top, sort, markets, minPrice, maxPrice, minRating } };
}

/** Keep only known marketplace ids and known field names; strings only, trimmed, max 500 chars. Never logged or stored. */
export function validateCredentials(input) {
  if (input == null) return { ok: true, value: {} };
  if (typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: ['credentials must be an object keyed by marketplace id.'] };
  const out = {};
  for (const [id, fields] of Object.entries(input)) {
    const market = MARKETPLACES.find((m) => m.id === id);
    if (!market) return { ok: false, errors: [`Unknown marketplace in credentials: ${id.slice(0, 30)}.`] };
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return { ok: false, errors: [`Credentials for ${market.name} must be an object.`] };
    const clean = {};
    for (const f of market.fields) {
      const v = fields[f.name];
      if (v === undefined || v === null || v === '') continue;
      if (typeof v !== 'string' || v.length > 500) return { ok: false, errors: [`${market.name}: ${f.label} must be text of at most 500 characters.`] };
      if (v.trim()) clean[f.name] = v.trim();
    }
    if (Object.keys(clean).length) out[id] = clean;
  }
  return { ok: true, value: out };
}
