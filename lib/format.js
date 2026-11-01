export function formatPrice(value, currency = 'INR') {
  if (value == null) return '—';
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency', currency, maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}
export function formatCount(n, currency = 'INR') {
  return n == null ? 'Not available' : new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US').format(n);
}
