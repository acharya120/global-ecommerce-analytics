// Single source of truth for marketplaces. Safe to import from client and server.
export const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'US', name: 'United States', currency: 'USD' },
];

export const MARKETPLACES = [
  { id: 'amazon-in', name: 'Amazon India', country: 'IN', demoCatalog: true },
  { id: 'flipkart', name: 'Flipkart', country: 'IN', demoCatalog: true },
  { id: 'myntra', name: 'Myntra', country: 'IN', demoCatalog: false },
  { id: 'ajio', name: 'Ajio', country: 'IN', demoCatalog: false },
  { id: 'croma', name: 'Croma', country: 'IN', demoCatalog: true },
  { id: 'reliance-digital', name: 'Reliance Digital', country: 'IN', demoCatalog: true },
  { id: 'amazon-us', name: 'Amazon US', country: 'US', demoCatalog: true },
  { id: 'ebay', name: 'eBay', country: 'US', demoCatalog: true },
  { id: 'walmart', name: 'Walmart', country: 'US', demoCatalog: true },
  { id: 'best-buy', name: 'Best Buy', country: 'US', demoCatalog: true },
];

export const marketplaceName = (id) => MARKETPLACES.find((m) => m.id === id)?.name ?? id;
