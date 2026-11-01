import { ThumbsUp, ThumbsDown, Info } from 'lucide-react';

export default function ReviewAnalytics({ insights, compact = false }) {
  if (!insights) return null;
  if (!insights.sufficient) {
    return <p className="flex gap-2 rounded-xl bg-slate-100 p-3 text-xs text-ink-soft dark:bg-night dark:text-slate-400"><Info size={14} className="mt-0.5 shrink-0" />{insights.verdict}</p>;
  }
  const List = ({ items, tone, Icon, title }) => (
    <div>
      <p className={`mb-1 flex items-center gap-1.5 text-xs font-semibold ${tone}`}><Icon size={13} aria-hidden />{title}</p>
      {items.length ? <ul className="flex flex-wrap gap-1.5">{items.slice(0, compact ? 3 : 5).map((i) => <li key={i.theme} className="chip bg-slate-100 dark:bg-night">{i.theme}</li>)}</ul> : <p className="text-xs text-ink-soft dark:text-slate-400">None detected</p>}
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <List items={insights.pros} tone="text-emerald-700 dark:text-emerald-400" Icon={ThumbsUp} title="Pros" />
        <List items={insights.cons} tone="text-red-700 dark:text-red-400" Icon={ThumbsDown} title="Cons" />
      </div>
      <p className="text-sm"><span className="font-semibold">Verdict: </span>{insights.verdict}</p>
      <p className="flex gap-1.5 text-[11px] leading-snug text-ink-soft dark:text-slate-400"><Info size={12} className="mt-0.5 shrink-0" />{insights.label}</p>
    </div>
  );
}
