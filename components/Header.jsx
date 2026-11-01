'use client';
import { Moon, Sun, FlaskConical, Radio } from 'lucide-react';

export default function Header({ mode, onModeChange, dark, onToggleDark }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-paper/90 backdrop-blur dark:border-night-line dark:bg-night/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.svg" alt="" width={32} height={32} className="rounded-lg" />
          <div className="leading-tight">
            <p className="text-base font-bold">Review Ranker</p>
            <p className="hidden text-xs text-ink-soft dark:text-slate-400 sm:block">Phones ranked by how many people reviewed them</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Data mode" className="flex rounded-xl border border-slate-300 p-0.5 dark:border-night-line">
            <button onClick={() => onModeChange('demo')} aria-pressed={mode === 'demo'} className={`btn !px-3 !py-1.5 ${mode === 'demo' ? 'bg-saffron text-ink' : 'text-ink-soft dark:text-slate-300'}`}><FlaskConical size={15} /> Demo</button>
            <button onClick={() => onModeChange('live')} aria-pressed={mode === 'live'} className={`btn !px-3 !py-1.5 ${mode === 'live' ? 'bg-teal-brand text-white' : 'text-ink-soft dark:text-slate-300'}`}><Radio size={15} /> Live</button>
          </div>
          <button onClick={onToggleDark} className="btn btn-ghost !px-2.5" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
        </div>
      </div>
    </header>
  );
}
