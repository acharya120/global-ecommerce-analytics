// eBay Browse API (OAuth client-credentials). Written from the public docs; NOT verified live. Browse results carry no product review counts.
import { AppError } from '../../lib/errorHandler.js';
import { mapAll } from '../../lib/mapping.js';
import { recordUsage, underLimit } from '../../lib/usage.js';

export default {
  id: 'ebay',
  name: 'eBay',
  async search({ query, config, fetchImpl = fetch, signal, credentials = {} }) {
    const { appId, certId } = credentials;
    if (!appId || !certId) throw new AppError(503, 'UNAVAILABLE', 'Not connected. Paste your eBay App ID and Cert ID in the API connections panel.');
    if (!underLimit('ebay', config.maxApiCallsPerDay)) throw new AppError(429, 'LIMIT', 'Daily API call limit reached for eBay.');
    recordUsage('ebay', { query });
    const tokenRes = await fetchImpl('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST', signal, redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${appId}:${certId}`).toString('base64')}` },
      body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    });
    if (tokenRes.status === 400 || tokenRes.status === 401) throw new AppError(401, 'AUTH', 'eBay rejected the App ID / Cert ID.');
    if (!tokenRes.ok) throw new AppError(502, 'UPSTREAM', `eBay token endpoint returned HTTP ${tokenRes.status}.`);
    const { access_token: token } = await tokenRes.json();
    const res = await fetchImpl(`https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=25`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal, redirect: 'manual',
    });
    if (!res.ok) throw new AppError(502, 'UPSTREAM', `eBay Browse API returned HTTP ${res.status}.`);
    return mapAll(await res.json(), 'USD');
  },
};
