'use client';
import { useMemo, useState } from 'react';
import { Search, X, Clock, Loader2 } from 'lucide-react';

export const SUGGESTIONS = ['iPhone 17 Pro Max', 'Samsung Galaxy S26 Ultra', 'OnePlus 15', 'Google Pixel 10 Pro', 'Vivo X300 Pro', 'Xiaomi 17 Ultra', 'Nothing Phone 3', 'Redmi Note 15 Pro+'];

export default function SearchBar({ value, onChange, onSubmit, onClear, loading, history, onClearHistory }) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => {
    const v = value.trim().toLowerCase();
    const h = history.filter((x) => x.toLowerCase().includes(v)).map((t) => ({ t, h: true }));
    const s = SUGGESTIONS.filter((x) => x.toLowerCase().includes(v) && !history.includes(x)).map((t) => ({ t, h: false }));
    return [...h, ...s].slice(0, 7);
  }, [value, history]);

  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); setOpen(false); onSubmit(value); }} className="relative">
      <div className="surface flex items-center gap-2 px-4 py-2.5 focus-within:ring-2 focus-within:ring-teal-brand/40">
        <Search size={20} className="shrink-0 text-ink-soft" aria-hidden />
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Search a phone, e.g. iPhone 17 Pro Max"
          aria-label="Search products"
          maxLength={80}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-lg outline-none placeholder:text-slate-400"
        />
        {value && <button type="button" onClick={() => { onClear(); setOpen(false); }} aria-label="Clear search" className="rounded-lg p-1.5 text-ink-soft hover:bg-slate-100 dark:hover:bg-night-line"><X size={18} /></button>}
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}<span className="hidden sm:inline">Search</span></button>
      </div>
      {open && items.length > 0 && (
        <ul className="surface absolute inset-x-0 top-full z-10 mt-2 overflow-hidden py-1" role="listbox">
          {items.map(({ t, h }) => (
            <li key={t} role="option" aria-selected="false">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange(t); setOpen(false); onSubmit(t); }} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-night-line">
                {h ? <Clock size={14} className="text-ink-soft" /> : <Search size={14} className="text-ink-soft" />}{t}
              </button>
            </li>
          ))}
          {history.length > 0 && <li><button type="button" onMouseDown={(e) => { e.preventDefault(); onClearHistory(); }} className="w-full px-4 py-2 text-left text-xs text-ink-soft hover:underline">Clear search history</button></li>}
        </ul>
      )}
    </form>
  );
}
