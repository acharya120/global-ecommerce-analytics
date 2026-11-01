'use client';
import { useEffect, useRef, useState } from 'react';
import { PlugZap, CheckCircle2, XCircle, Loader2, ExternalLink, Eye, EyeOff, Trash2, ShieldCheck } from 'lucide-react';
import { MARKETPLACES, COUNTRIES, requiredFieldsFilled } from '../lib/marketplaces.js';

function MarketBox({ market, values, status, onValues, onStatus }) {
  const [shown, setShown] = useState({});
  const timer = useRef(null);
  const signature = JSON.stringify(values);

  // Auto-connect: once all required boxes are filled, test the connection shortly after the last keystroke.
  useEffect(() => {
    clearTimeout(timer.current);
    if (!requiredFieldsFilled(market, values)) { if (status?.state !== 'idle') onStatus(market.id, { state: 'idle' }); return undefined; }
    onStatus(market.id, { state: 'connecting' });
    const ctrl = new AbortController();
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marketId: market.id, credentials: values }), signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) onStatus(market.id, { state: 'failed', message: data?.error?.message || 'Connection test failed.' });
        else onStatus(market.id, data.ok ? { state: 'connected', message: data.message } : { state: 'failed', message: data.message });
      } catch (e) { if (e.name !== 'AbortError') onStatus(market.id, { state: 'failed', message: 'Network error while testing the connection.' }); }
    }, 900);
    return () => { clearTimeout(timer.current); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const st = status?.state ?? 'idle';
  const badge = { idle: ['Not connected', 'bg-slate-100 text-ink-soft dark:bg-night dark:text-slate-400', null], connecting: ['Connecting…', 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200', Loader2], connected: ['Connected', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200', CheckCircle2], failed: ['Failed', 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', XCircle] }[st];
  const Icon = badge[2];
  return (
    <div className="surface space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">{market.name}</h4>
        <span className={`chip gap-1 ${badge[1]}`} role="status">{Icon && <Icon size={13} className={st === 'connecting' ? 'animate-spin' : ''} aria-hidden />}{badge[0]}</span>
      </div>
      {market.fields.map((f) => {
        const id = `${market.id}-${f.name}`;
        const reveal = shown[f.name];
        return (
          <div key={f.name}>
            <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-soft dark:text-slate-400">{f.label}{f.required ? '' : ' — optional'}</label>
            <div className="flex gap-1.5">
              <input id={id} className="field w-full" type={f.secret && !reveal ? 'password' : 'text'} autoComplete="off" spellCheck={false} maxLength={500} placeholder={f.placeholder} value={values[f.name] ?? ''} onChange={(e) => onValues(market.id, { ...values, [f.name]: e.target.value })} />
              {f.secret && <button type="button" className="btn btn-ghost !px-2.5" onClick={() => setShown({ ...shown, [f.name]: !reveal })} aria-label={reveal ? `Hide ${f.label}` : `Show ${f.label}`}>{reveal ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
            </div>
          </div>
        );
      })}
      {status?.message && <p className={`text-xs ${st === 'failed' ? 'text-red-700 dark:text-red-300' : 'text-ink-soft dark:text-slate-400'}`}>{status.message}</p>}
      <p className="text-xs text-ink-soft dark:text-slate-400">{market.note}</p>
      <div className="flex items-center justify-between text-xs">
        {market.docsUrl ? <a href={market.docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Get credentials <ExternalLink size={12} /></a> : <span />}
        {Object.keys(values).length > 0 && <button type="button" onClick={() => onValues(market.id, {})} className="inline-flex items-center gap-1 text-ink-soft underline dark:text-slate-400"><Trash2 size={12} /> Remove</button>}
      </div>
    </div>
  );
}

export default function ApiKeysPanel({ creds, onCreds, statuses, onStatus, remember, onRemember, open }) {
  const connected = Object.values(statuses).filter((s) => s?.state === 'connected').length;
  return (
    <details open={open} className="surface p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold"><PlugZap size={18} className="text-teal-brand" aria-hidden />API connections<span className="chip bg-teal-soft text-teal-brand dark:bg-teal-brand/20 dark:text-teal-200">{connected} connected</span></summary>
      <div className="mt-4 space-y-5">
        <p className="flex gap-2 rounded-xl bg-slate-100 p-3 text-xs dark:bg-night"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-teal-brand" aria-hidden /><span>Paste a key and it connects automatically. Keys are sent over HTTPS to this site&apos;s server only to run your searches and are <strong>never stored or logged there</strong>. Only use credentials you are authorised to use; each provider&apos;s terms and costs apply to you.</span></p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-teal-600" checked={remember} onChange={(e) => onRemember(e.target.checked)} />Remember keys on this device (browser storage — leave off on shared computers)</label>
        {COUNTRIES.map((c) => (
          <div key={c.code}>
            <h3 className="mb-2 text-sm font-semibold">{c.name}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {MARKETPLACES.filter((m) => m.country === c.code).map((m) => <MarketBox key={m.id} market={m} values={creds[m.id] ?? {}} status={statuses[m.id]} onValues={onCreds} onStatus={onStatus} />)}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
