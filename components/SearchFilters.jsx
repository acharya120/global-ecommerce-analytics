'use client';
import { MARKETPLACES, COUNTRIES } from '../lib/marketplaces.js';

const Label = ({ children }) => <span className="mb-1 block text-xs font-medium text-ink-soft dark:text-slate-400">{children}</span>;

export default function SearchFilters({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const markets = MARKETPLACES.filter((m) => m.country === filters.country);
  const toggle = (id) => set({ markets: filters.markets.includes(id) ? filters.markets.filter((x) => x !== id) : [...filters.markets, id] });
  return (
    <section aria-label="Search filters" className="surface space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <label><Label>Country</Label>
          <select className="field w-full" value={filters.country} onChange={(e) => set({ country: e.target.value, markets: [] })}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
        <label><Label>Show</Label>
          <select className="field w-full" value={filters.top} onChange={(e) => set({ top: Number(e.target.value) })}><option value={5}>Top 5</option><option value={10}>Top 10</option></select></label>
        <label className="col-span-2 md:col-span-1"><Label>Sort by</Label>
          <select className="field w-full" value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
            <option value="reviews">Most reviewed</option><option value="rating">Highest rated</option><option value="price-asc">Lowest price</option><option value="price-desc">Highest price</option></select></label>
        <label><Label>Min price</Label><input className="field w-full" inputMode="numeric" placeholder="0" value={filters.minPrice} onChange={(e) => set({ minPrice: e.target.value.replace(/\D/g, '') })} /></label>
        <label><Label>Max price</Label><input className="field w-full" inputMode="numeric" placeholder="Any" value={filters.maxPrice} onChange={(e) => set({ maxPrice: e.target.value.replace(/\D/g, '') })} /></label>
        <label><Label>Min rating</Label>
          <select className="field w-full" value={filters.minRating} onChange={(e) => set({ minRating: e.target.value })}><option value="">Any</option><option value="4">4.0+</option><option value="4.3">4.3+</option><option value="4.5">4.5+</option></select></label>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-ink-soft dark:text-slate-400">Marketplaces {filters.markets.length === 0 && '(all selected)'}</legend>
        <div className="flex flex-wrap gap-2">
          {markets.map((m) => {
            const on = filters.markets.includes(m.id);
            return <button key={m.id} type="button" aria-pressed={on} onClick={() => toggle(m.id)} className={`chip border px-3 py-1.5 text-sm transition ${on ? 'border-teal-brand bg-teal-brand text-white' : 'border-slate-300 hover:bg-slate-100 dark:border-night-line dark:hover:bg-night-line'}`}>{m.name}</button>;
          })}
        </div>
      </fieldset>
    </section>
  );
}
