'use client';
import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import SearchBar from '../components/SearchBar.jsx';
import SearchFilters from '../components/SearchFilters.jsx';
import ApiKeysPanel from '../components/ApiKeysPanel.jsx';
import ResultsDashboard from '../components/ResultsDashboard.jsx';

const DEFAULT_FILTERS = { country: 'IN', markets: [], top: 10, sort: 'reviews', minPrice: '', maxPrice: '', minRating: '' };
const HISTORY_KEY = 'gea-history';
const CREDS_KEY = 'gea-creds';

export default function Home() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [mode, setMode] = useState('demo');
  const [state, setState] = useState({ status: 'idle', data: null, error: null });
  const [history, setHistory] = useState([]);
  const [compare, setCompare] = useState([]);
  const [dark, setDark] = useState(false);
  const [creds, setCreds] = useState({});
  const [statuses, setStatuses] = useState({});
  const [remember, setRemember] = useState(false);
  const [notice, setNotice] = useState('');
  const ctrl = useRef(null);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')); } catch { /* storage unavailable */ }
    try { const saved = localStorage.getItem(CREDS_KEY); if (saved) { setCreds(JSON.parse(saved)); setRemember(true); } } catch { /* ignore */ }
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function updateCreds(id, values) {
    setCreds((prev) => {
      const next = { ...prev };
      if (Object.values(values).some(Boolean)) next[id] = values; else delete next[id];
      if (remember) { try { localStorage.setItem(CREDS_KEY, JSON.stringify(next)); } catch { /* ignore */ } }
      return next;
    });
  }
  function changeRemember(on) {
    setRemember(on);
    try { if (on) localStorage.setItem(CREDS_KEY, JSON.stringify(creds)); else localStorage.removeItem(CREDS_KEY); } catch { /* ignore */ }
  }
  function updateStatus(id, status) {
    setStatuses((prev) => (prev[id]?.state === status.state && prev[id]?.message === status.message ? prev : { ...prev, [id]: status }));
    if (status.state === 'connected' && mode === 'demo') {
      setMode('live');
      setNotice('Connected. Switched to Live Mode so searches use your connected marketplace(s).');
    }
  }

  async function search(q, f = filters, m = mode, { remember: saveHistory = true } = {}) {
    const text = q.trim();
    if (text.length < 2) { setState({ status: 'error', data: null, error: 'Enter at least 2 characters to search.' }); return; }
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setSubmitted(text);
    setState((s) => ({ status: 'loading', data: s.data, error: null }));
    const body = { q: text, mode: m, country: f.country, top: f.top, sort: f.sort, markets: f.markets };
    for (const k of ['minPrice', 'maxPrice', 'minRating']) if (f[k] !== '') body[k] = f[k];
    if (m === 'live') {
      const ids = f.markets.length ? f.markets : null;
      const used = Object.fromEntries(Object.entries(creds).filter(([id]) => !ids || ids.includes(id)));
      if (Object.keys(used).length) body.credentials = used;
    }
    try {
      const res = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.current.signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || `Request failed (${res.status})`);
      setState({ status: 'done', data: json, error: null });
      if (saveHistory) {
        const next = [text, ...history.filter((h) => h.toLowerCase() !== text.toLowerCase())].slice(0, 8);
        setHistory(next);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setState({ status: 'error', data: null, error: e.message || 'Network error. Check your connection and try again.' });
    }
  }

  // Re-run the current search when filters, mode or connected keys change (debounced for typing).
  const connectedSig = Object.entries(statuses).filter(([, s]) => s?.state === 'connected').map(([id]) => id).sort().join(',');
  useEffect(() => {
    if (!submitted) return undefined;
    const t = setTimeout(() => search(submitted, filters, mode, { remember: false }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, mode, connectedSig]);

  function changeMode(next) {
    if (next === 'live' && !window.confirm('Live Mode requests real marketplace data using the API keys you paste in "API connections" (sent to this site\'s server for each search, never stored there).\n\nPaid providers stay OFF unless the site owner enabled them. Continue?')) return;
    setNotice('');
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
        {notice && <p role="status" className="rounded-xl border border-teal-brand/40 bg-teal-soft px-4 py-2.5 text-sm text-ink dark:bg-teal-brand/20 dark:text-slate-100">{notice}</p>}
        <SearchFilters filters={filters} onChange={setFilters} />
        <ApiKeysPanel creds={creds} onCreds={updateCreds} statuses={statuses} onStatus={updateStatus} remember={remember} onRemember={changeRemember} open={mode === 'live' && connectedSig === ''} />
        <ResultsDashboard state={state} compare={compare} onToggleCompare={toggleCompare} onClearCompare={() => setCompare([])} onPick={(s) => { setQuery(s); search(s); }} />
        <footer className="pb-6 pt-2 text-center text-xs text-ink-soft dark:text-slate-400">
          Insights are automated keyword analysis, not verified AI. Demo Mode uses sample data only.
        </footer>
      </main>
    </>
  );
}
