export { hashString } from '../lib/normalization.js';
export const sanitizeText = (s, max = 400) => String(s).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
