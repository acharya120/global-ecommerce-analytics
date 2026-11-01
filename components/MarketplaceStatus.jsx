import { CheckCircle2, AlertTriangle, Ban, Clock } from 'lucide-react';

const META = {
  ok: { icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400', label: 'Available' },
  unavailable: { icon: Ban, cls: 'text-slate-500', label: 'Unavailable' },
  timeout: { icon: Clock, cls: 'text-amber-600', label: 'Timed out' },
  limit: { icon: AlertTriangle, cls: 'text-amber-600', label: 'Limit reached' },
  error: { icon: AlertTriangle, cls: 'text-red-600 dark:text-red-400', label: 'Error' },
};

export default function MarketplaceStatus({ marketplaces }) {
  return (
    <section aria-label="Marketplace availability" className="surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Marketplace availability</h3>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {marketplaces.map((m) => {
          const { icon: Icon, cls, label } = META[m.status] ?? META.error;
          return (
            <li key={m.id} className="flex items-start gap-2 text-sm">
              <Icon size={16} className={`mt-0.5 shrink-0 ${cls}`} aria-hidden />
              <div className="min-w-0"><p className="font-medium">{m.name} <span className={`text-xs font-normal ${cls}`}>{label}{m.status === 'ok' ? ` · ${m.count} listing${m.count === 1 ? '' : 's'}` : ''}</span></p>
                {m.message && m.status !== 'ok' && <p className="text-xs text-ink-soft dark:text-slate-400">{m.message}</p>}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
