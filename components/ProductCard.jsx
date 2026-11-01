import { Star, ExternalLink, Scale } from 'lucide-react';
import ReviewAnalytics from './ReviewAnalytics.jsx';
import { formatPrice, formatCount } from '../lib/format.js';
import { placeholderImage } from '../lib/placeholder.js';
import { marketplaceName } from '../lib/marketplaces.js';

export default function ProductCard({ product: p, maxReviews, selected, onToggleCompare, sortLabel }) {
  const share = p.reviewCount && maxReviews ? Math.max(3, Math.round((p.reviewCount / maxReviews) * 100)) : 0;
  const link = p.offers.find((o) => o.url)?.url;
  return (
    <article className="surface flex flex-col gap-4 p-5" aria-label={p.name}>
      <div className="flex gap-4">
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image || placeholderImage(p.name)} alt={`${p.name}`} width={96} height={96} className="h-24 w-24 rounded-xl object-cover" loading="lazy" />
          <span className="absolute -left-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-bold text-white dark:bg-teal-brand num" title={`Rank ${p.rank} (${sortLabel})`}>{p.rank}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-snug">{p.name}</h3>
          <p className="mt-0.5 text-xs text-ink-soft dark:text-slate-400">{p.marketplaces.map(marketplaceName).join(', ')}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="num text-xl font-bold">{formatPrice(p.price, p.currency)}</span>
            {p.originalPrice && <span className="num text-sm text-slate-400 line-through">{formatPrice(p.originalPrice, p.currency)}</span>}
            {p.discountPct && <span className="chip bg-teal-soft text-teal-brand dark:bg-teal-brand/20 dark:text-teal-200">{p.discountPct}% off</span>}
          </div>
          <p className="text-[11px] text-ink-soft dark:text-slate-400">lowest price among listings</p>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div><p className="num text-3xl font-extrabold leading-none">{formatCount(p.reviewCount, p.currency)}</p><p className="mt-1 text-xs text-ink-soft dark:text-slate-400">reviews across {p.reviewBreakdown.length} independent source{p.reviewBreakdown.length === 1 ? '' : 's'}</p></div>
          <p className="flex items-center gap-1 text-sm font-semibold" aria-label={`Average rating ${p.rating ?? 'not available'}`}><Star size={16} className="fill-saffron text-saffron" aria-hidden />{p.rating ?? '—'}</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-night" aria-hidden><div className="h-full rounded-full bg-teal-brand" style={{ width: `${share}%` }} /></div>
        {p.reviewBreakdown.length > 1 && <p className="num mt-1.5 text-[11px] text-ink-soft dark:text-slate-400">{p.reviewBreakdown.map((b) => `${marketplaceName(b.marketplaceId)} ${formatCount(b.reviewCount, p.currency)}`).join(' + ')}</p>}
      </div>

      <ReviewAnalytics insights={p.insights} compact />

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={selected} onChange={() => onToggleCompare(p.key)} className="h-4 w-4 accent-teal-600" /><Scale size={14} aria-hidden />Compare</label>
        {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-primary !py-1.5">View product <ExternalLink size={14} /></a>
          : <span className="chip bg-saffron/20 text-ink dark:text-saffron" title="Demo listings have no real product page">Demo listing · no link</span>}
      </div>
      {p.isDemo && <p className="-mt-2 text-[11px] font-semibold text-amber-700 dark:text-saffron">DEMO DATA — sample values, not real marketplace information.</p>}
    </article>
  );
}
