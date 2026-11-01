import { SearchX, AlertCircle, Smartphone } from 'lucide-react';
import ProductCard from './ProductCard.jsx';
import ProductComparison from './ProductComparison.jsx';
import MarketplaceStatus from './MarketplaceStatus.jsx';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import { SUGGESTIONS } from './SearchBar.jsx';

const SORT_LABEL = { reviews: 'most reviewed', rating: 'highest rated', 'price-asc': 'lowest price', 'price-desc': 'highest price' };

export default function ResultsDashboard({ state, compare, onToggleCompare, onClearCompare, onPick }) {
  const { status, data, error } = state;
  if (status === 'idle') return (
    <div className="surface p-8 text-center">
      <Smartphone className="mx-auto mb-3 text-teal-brand" size={32} aria-hidden />
      <h2 className="text-lg font-bold">Find the phones people review most</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft dark:text-slate-400">Search for a phone. Results are ranked by total review volume, with pros, cons and a verdict for each.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">{SUGGESTIONS.slice(0, 5).map((s) => <button key={s} onClick={() => onPick(s)} className="chip border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-night-line dark:hover:bg-night-line">{s}</button>)}</div>
    </div>
  );
  if (status === 'loading') return <LoadingSkeleton />;
  if (status === 'error') return (
    <div role="alert" className="surface flex gap-3 border-red-300 p-5 dark:border-red-900"><AlertCircle className="shrink-0 text-red-600" aria-hidden /><div><h2 className="font-semibold">The search did not complete</h2><p className="text-sm text-ink-soft dark:text-slate-300">{error}</p></div></div>
  );

  const { products, unranked, totals, marketplaces } = data;
  const maxReviews = products.reduce((m, p) => Math.max(m, p.reviewCount ?? 0), 0);
  const chosen = products.filter((p) => compare.includes(p.key));
  return (
    <div className="space-y-5">
      {data.isDemo && <p role="note" className="rounded-xl border border-saffron/60 bg-saffron/15 px-4 py-2.5 text-sm font-medium">DEMO DATA — these are sample listings for demonstration, not real marketplace information.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Products found', totals.productsFound], ['Marketplaces searched', `${totals.marketplacesOk} of ${totals.marketplacesSearched} available`], ['Showing', `Top ${data.top}, ${SORT_LABEL[data.sort]}`], ['Last updated', new Date(data.generatedAt).toLocaleTimeString()]].map(([k, v]) => (
          <div key={k} className="surface p-3"><p className="text-xs text-ink-soft dark:text-slate-400">{k}</p><p className="num text-base font-bold">{v}</p></div>
        ))}
      </div>
      {products.length === 0 ? (
        <div className="surface p-8 text-center"><SearchX className="mx-auto mb-2 text-ink-soft" aria-hidden /><h2 className="font-semibold">No products match “{data.query}”</h2><p className="text-sm text-ink-soft dark:text-slate-400">Try a shorter name, remove price or rating filters, or select more marketplaces.</p></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">{products.map((p) => <ProductCard key={p.key} product={p} maxReviews={maxReviews} selected={compare.includes(p.key)} onToggleCompare={onToggleCompare} sortLabel={SORT_LABEL[data.sort]} />)}</div>
      )}
      <ProductComparison products={chosen} onRemove={onToggleCompare} onClear={onClearCompare} />
      {unranked.length > 0 && (
        <section className="surface p-4"><h3 className="text-sm font-semibold">Missing review counts (not ranked)</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-ink-soft dark:text-slate-300">{unranked.map((p) => <li key={p.key}>{p.name}</li>)}</ul></section>
      )}
      <MarketplaceStatus marketplaces={marketplaces} />
    </div>
  );
}
