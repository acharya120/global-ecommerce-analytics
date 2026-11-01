export default function LoadingSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Loading results">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="surface animate-pulse space-y-4 p-5">
          <div className="flex gap-4"><div className="h-24 w-24 rounded-xl bg-slate-200 dark:bg-night-line" /><div className="flex-1 space-y-3"><div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-night-line" /><div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-night-line" /><div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-night-line" /></div></div>
          <div className="h-2 rounded bg-slate-200 dark:bg-night-line" /><div className="h-12 rounded bg-slate-200 dark:bg-night-line" />
        </div>
      ))}
    </div>
  );
}
