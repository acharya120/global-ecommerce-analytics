// OPTIONAL paid scraping providers. DISABLED by default and never called automatically.
// Use only on pages you are authorised to fetch; do not use it to bypass CAPTCHAs or anti-bot protections.
import { AppError } from '../lib/errorHandler.js';
import { recordUsage, underLimit } from '../lib/usage.js';

const PROVIDERS = {
  scraperapi: { keyName: 'scraperApi', build: (k, u) => `https://api.scraperapi.com/?api_key=${encodeURIComponent(k)}&url=${encodeURIComponent(u)}` },
  scrapingbee: { keyName: 'scrapingBee', build: (k, u) => `https://app.scrapingbee.com/api/v1/?api_key=${encodeURIComponent(k)}&url=${encodeURIComponent(u)}` },
};

export function providerStatus(config) {
  return Object.entries(PROVIDERS).map(([id, p]) => ({ id, keyPresent: Boolean(config.keys[p.keyName]), enabled: config.paidProvidersEnabled && Boolean(config.keys[p.keyName]) }));
}

export async function fetchViaProvider({ provider, url, config, fetchImpl = fetch, signal }) {
  const p = PROVIDERS[provider];
  if (!p) throw new AppError(400, 'PROVIDER', `Unsupported provider: ${provider}`);
  if (!config.paidProvidersEnabled) throw new AppError(403, 'PAID_DISABLED', 'Paid providers are disabled. Set PAID_PROVIDERS_ENABLED=true only if you accept the provider\'s charges.');
  const key = config.keys[p.keyName];
  if (!key) throw new AppError(503, 'UNAVAILABLE', `No API key configured for ${provider}.`);
  if (!underLimit(provider, config.maxApiCallsPerDay)) throw new AppError(429, 'LIMIT', `Daily call limit reached for ${provider}.`);
  recordUsage(provider, { host: new URL(url).host });
  const res = await fetchImpl(p.build(key, url), { signal }); // single attempt: no automatic paid retries
  if (!res.ok) throw new AppError(502, 'UPSTREAM', `${provider} returned HTTP ${res.status}`);
  return res.text();
}
