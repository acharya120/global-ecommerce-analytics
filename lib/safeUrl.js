import { AppError } from './errorHandler.js';

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

/** Basic SSRF guard for user-supplied feed URLs: https only, no credentials in URL, no localhost / private / link-local hosts. */
export function assertSafeUrl(input) {
  let u;
  try { u = new URL(String(input)); } catch { throw new AppError(400, 'BAD_URL', 'Feed URL is not a valid URL.'); }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const bad = u.protocol !== 'https:' || u.username || u.password || String(input).length > 500 || !host.includes('.') && !host.includes(':')
    || host === 'localhost' || /\.(local|localhost|internal|lan|home)$/.test(host)
    || PRIVATE_V4.some((r) => r.test(host)) || host === '::1' || /^(fc|fd|fe80)/.test(host) || host.startsWith('::ffff:');
  if (bad) throw new AppError(400, 'BAD_URL', 'Feed URL must be a public https:// address (no localhost, private network or embedded passwords).');
  return u;
}
