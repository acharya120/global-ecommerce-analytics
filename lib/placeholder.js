// Reliable offline placeholder (inline SVG data URI) — no external image hosts needed.
const PALETTE = [['#0f766e', '#134e4a'], ['#b45309', '#78350f'], ['#1d4ed8', '#1e3a8a'], ['#9f1239', '#4c0519'], ['#4d7c0f', '#365314'], ['#6d28d9', '#4c1d95']];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function placeholderImage(label = 'Phone') {
  const seed = [...label].reduce((s, c) => s + c.charCodeAt(0), 0);
  const [a, b] = PALETTE[seed % PALETTE.length];
  const words = label.split(/\s+/).filter(Boolean);
  const t1 = esc((words[0] ?? '').slice(0, 14)), t2 = esc(words.slice(1, 4).join(' ').slice(0, 20));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="240" height="240" fill="url(#g)"/><rect x="82" y="34" width="76" height="140" rx="13" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3"/><circle cx="120" cy="46" r="3" fill="#fff" fill-opacity=".75"/><text x="120" y="204" font-family="sans-serif" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">${t1}</text><text x="120" y="224" font-family="sans-serif" font-size="12" fill="#fff" fill-opacity=".85" text-anchor="middle">${t2}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
