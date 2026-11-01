'use client';
import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import SearchBar from '../components/SearchBar.jsx';
import SearchFilters from '../components/SearchFilters.jsx';
import ResultsDashboard from '../components/ResultsDashboard.jsx';

const DEFAULT_FILTERS = { country: 'IN', markets: [], top: 10, sort: 'reviews', minPrice: '', maxPrice: '', minRating: '' };
const HISTORY_KEY = 'gea-history';

export default function Home() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [mode, setMode] = useState('demo');
  const [state, setState] = useState({ status: 'idle', data: null, error: null });
  const [history, setHistory] = useState([]);
  const [compare, setCompare] = useState([]);
  const [dark, setDark] = useState(false);
  const ctrl = useRef(null);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')); } catch { /* storage unavailable */ }
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  async function search(q, f = filters, m = mode, { remember = true } = {}) {
    const text = q.trim();
    if (text.length < 2) { setState({ status: 'error', data: null, error: 'Enter at least 2 characters to search.' }); return; }
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setSubmitted(text);
    setState((s) => ({ status: 'loading', data: s.data, error: null }));
    const params = new URLSearchParams({ q: text, mode: m, country: f.country, top: String(f.top), sort: f.sort });
    if (f.markets.length) params.set('markets', f.markets.join(','));
    for (const k of ['minPrice', 'maxPrice', 'minRating']) if (f[k] !== '') params.set(k, f[k]);
    try {
      const res = await fetch(`/api/search?${params}`, { signal: ctrl.current.signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || `Request failed (${res.status})`);
      setState({ status: 'done', data: json, error: null });
      if (remember) {
        const next = [text, ...history.filter((h) => h.toLowerCase() !== text.toLowerCase())].slice(0, 8);
        setHistory(next);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setState({ status: 'error', data: null, error: e.message || 'Network error. Check your connection and try again.' });
    }
  }

  // Re-run the current search when filters or mode change (debounced for price typing).
  useEffect(() => {
    if (!submitted) return undefined;
    const t = setTimeout(() => search(submitted, filters, mode, { remember: false }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, mode]);

  function changeMode(next) {
    if (next === 'live' && !window.confirm('Live Mode requests real marketplace data and may call external APIs.\n\nPaid providers stay OFF unless the site owner enabled them on the server, and Live Mode itself must be enabled there. Continue?')) return;
    setMode(next);
  }
  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('gea-theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
  }
  const toggleCompare = (key) => setCompare((c) => (c.includes(key) ? c.filter((k) => k !== key) : c.length >= 3 ? c : [...c, key]));

  return (
    <>
      <Header mode={mode} onModeChange={changeMode} dark={dark} onToggleDark={toggleDark} />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <SearchBar
          value={query} onChange={setQuery} loading={state.status === 'loading'} history={history}
          onSubmit={(q) => search(q)} onClear={() => { setQuery(''); setSubmitted(''); setState({ status: 'idle', data: null, error: null }); setCompare([]); }}
          onClearHistory={() => { setHistory([]); try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ } }}
        />
        <SearchFilters filters={filters} onChange={setFilters} />
        <ResultsDashboard state={state} compare={compare} onToggleCompare={toggleCompare} onClearCompare={() => setCompare([])} onPick={(s) => { setQuery(s); search(s); }} />
        <footer className="pb-6 pt-2 text-center text-xs text-ink-soft dark:text-slate-400">
          Insights are automated keyword analysis, not verified AI. Demo Mode uses sample data only.
        </footer>
      </main>
    </>
  );
}
