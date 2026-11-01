// Generic connector for an AUTHORISED partner feed / licensed data provider returning JSON.
import { AppError } from '../../lib/errorHandler.js';
import { assertSafeUrl } from '../../lib/safeUrl.js';
import { mapAll } from '../../lib/mapping.js';
import { recordUsage, underLimit } from '../../lib/usage.js';

const MAX_BYTES = 2_000_000;

export function feedAdapter(id, name, currency) {
  return {
    id, name,
    async search({ query, config, fetchImpl = fetch, signal, credentials = {} }) {
      if (!credentials.feedUrl) throw new AppError(503, 'UNAVAILABLE', `Not connected. Paste an authorised feed URL for ${name} in the API connections panel.`);
      if (!underLimit(id, config.maxApiCallsPerDay)) throw new AppError(429, 'LIMIT', `Daily API call limit reached for ${name}.`);
      const raw = credentials.feedUrl.includes('{query}') ? credentials.feedUrl.replaceAll('{query}', encodeURIComponent(query)) : credentials.feedUrl;
      const u = assertSafeUrl(raw);
      if (!credentials.feedUrl.includes('{query}') && !u.searchParams.has('q')) u.searchParams.set('q', query);
      const headers = { Accept: 'application/json' };
      if (credentials.apiKey) { headers.Authorization = `Bearer ${credentials.apiKey}`; headers['x-api-key'] = credentials.apiKey; }
      recordUsage(id, { host: u.host });
      const res = await fetchImpl(u.toString(), { headers, signal, redirect: 'manual' });
      if (!res.ok) throw new AppError(502, 'UPSTREAM', `${name} feed returned HTTP ${res.status}${res.status >= 300 && res.status < 400 ? ' (redirects are not followed)' : ''}.`);
      const text = await res.text();
      if (text.length > MAX_BYTES) throw new AppError(502, 'UPSTREAM', `${name} feed response is too large.`);
      let json;
      try { json = JSON.parse(text); } catch { throw new AppError(502, 'UPSTREAM', `${name} feed did not return JSON.`); }
      return mapAll(json, currency);
    },
  };
}
