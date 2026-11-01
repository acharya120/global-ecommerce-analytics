// Flipkart Affiliate product search API. Written from the public affiliate documentation; NOT verified against the live service in the build environment.
import { AppError } from '../../lib/errorHandler.js';
import { mapAll } from '../../lib/mapping.js';
import { recordUsage, underLimit } from '../../lib/usage.js';

export default {
  id: 'flipkart',
  name: 'Flipkart',
  async search({ query, config, fetchImpl = fetch, signal, credentials = {} }) {
    const { affiliateId, affiliateToken } = credentials;
    if (!affiliateId || !affiliateToken) throw new AppError(503, 'UNAVAILABLE', 'Not connected. Paste your Flipkart affiliate ID and token in the API connections panel.');
    if (!underLimit('flipkart', config.maxApiCallsPerDay)) throw new AppError(429, 'LIMIT', 'Daily API call limit reached for Flipkart.');
    recordUsage('flipkart', { query });
    const res = await fetchImpl(`https://affiliate-api.flipkart.net/affiliate/1.0/search.json?query=${encodeURIComponent(query)}&resultCount=20`, {
      headers: { 'Fk-Affiliate-Id': affiliateId, 'Fk-Affiliate-Token': affiliateToken, Accept: 'application/json' }, signal, redirect: 'manual',
    });
    if (res.status === 401 || res.status === 403) throw new AppError(401, 'AUTH', 'Flipkart rejected the affiliate ID / token.');
    if (!res.ok) throw new AppError(502, 'UPSTREAM', `Flipkart API returned HTTP ${res.status}.`);
    return mapAll(await res.json(), 'INR');
  },
};
