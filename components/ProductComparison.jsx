import { X } from 'lucide-react';
import { formatPrice, formatCount } from '../lib/format.js';

export default function ProductComparison({ products, onRemove, onClear }) {
  if (products.length < 2) return null;
  const rows = [
    ['Best price', (p) => formatPrice(p.price, p.currency)],
    ['Rating', (p) => p.rating ?? '—'],
    ['Reviews', (p) => formatCount(p.reviewCount, p.currency)],
    ['Marketplaces', (p) => p.marketplaces.length],
    ['Pros', (p) => (p.insights.sufficient ? p.insights.pros.map((x) => x.theme).join(', ') || '—' : 'Not enough review text')],
    ['Cons', (p) => (p.insights.sufficient ? p.insights.cons.map((x) => x.theme).join(', ') || '—' : 'Not enough review text')],
  ];
  return (
    <section aria-label="Product comparison" className="surface p-4">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Comparison</h3><button onClick={onClear} className="text-xs text-ink-soft underline dark:text-slate-400">Clear</button></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead><tr><th className="w-28 p-2" />{products.map((p) => <th key={p.key} className="p-2 align-top"><div className="flex items-start justify-between gap-2"><span>{p.name}</span><button onClick={() => onRemove(p.key)} aria-label={`Remove ${p.name}`}><X size={14} /></button></div></th>)}</tr></thead>
          <tbody>{rows.map(([label, f]) => <tr key={label} className="border-t border-slate-200 dark:border-night-line"><th scope="row" className="p-2 text-xs font-medium text-ink-soft dark:text-slate-400">{label}</th>{products.map((p) => <td key={p.key} className="num p-2 align-top">{f(p)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
