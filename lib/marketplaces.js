// Single source of truth for marketplaces. Safe to import from client and server (contains no secrets).
export const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'US', name: 'United States', currency: 'USD' },
];

const FEED_FIELDS = [
  { name: 'feedUrl', label: 'Authorised feed URL (https)', placeholder: 'https://partner.example.com/search?q={query}', secret: false, required: true },
  { name: 'apiKey', label: 'API key / token (optional)', placeholder: 'Sent as Bearer token and x-api-key header', secret: true, required: false },
];
const feed = (id, name, country, demoCatalog, note) => ({ id, name, country, demoCatalog, connector: 'feed', fields: FEED_FIELDS, docsUrl: null, note });
const FEED_NOTE = 'No public key-based product API is built in for this marketplace. Paste the URL of a feed you are authorised to use (partner programme or licensed data provider). Use {query} where the search text goes.';

export const MARKETPLACES = [
  feed('amazon-in', 'Amazon India', 'IN', true, FEED_NOTE),
  { id: 'flipkart', name: 'Flipkart', country: 'IN', demoCatalog: true, connector: 'flipkart', docsUrl: 'https://affiliate.flipkart.com',
    fields: [{ name: 'affiliateId', label: 'Affiliate ID', placeholder: 'Your Flipkart affiliate ID', secret: false, required: true }, { name: 'affiliateToken', label: 'Affiliate token', placeholder: 'Your Flipkart affiliate token', secret: true, required: true }],
    note: 'Uses the Flipkart Affiliate product search API. It may not return review counts; such products are listed under "Missing review counts" instead of being ranked.' },
  feed('myntra', 'Myntra', 'IN', false, FEED_NOTE),
  feed('ajio', 'Ajio', 'IN', false, FEED_NOTE),
  feed('croma', 'Croma', 'IN', true, FEED_NOTE),
  feed('reliance-digital', 'Reliance Digital', 'IN', true, FEED_NOTE),
  feed('amazon-us', 'Amazon US', 'US', true, FEED_NOTE),
  { id: 'ebay', name: 'eBay', country: 'US', demoCatalog: true, connector: 'ebay', docsUrl: 'https://developer.ebay.com',
    fields: [{ name: 'appId', label: 'App ID (Client ID)', placeholder: 'eBay developer App ID', secret: false, required: true }, { name: 'certId', label: 'Cert ID (Client secret)', placeholder: 'eBay developer Cert ID', secret: true, required: true }],
    note: 'Uses the eBay Browse API. It does not return product review counts, so results are listed under "Missing review counts".' },
  feed('walmart', 'Walmart', 'US', true, FEED_NOTE),
  { id: 'best-buy', name: 'Best Buy', country: 'US', demoCatalog: true, connector: 'best-buy', docsUrl: 'https://developer.bestbuy.com',
    fields: [{ name: 'apiKey', label: 'API key', placeholder: 'Free key from developer.bestbuy.com', secret: true, required: true }],
    note: 'Returns real prices, ratings and review counts.' },
];

export const marketplaceName = (id) => MARKETPLACES.find((m) => m.id === id)?.name ?? id;
export const requiredFieldsFilled = (market, values = {}) => market.fields.filter((f) => f.required).every((f) => String(values[f.name] ?? '').trim());
