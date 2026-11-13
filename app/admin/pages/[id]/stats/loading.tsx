export default function LoadingStats() {
  return <div role="status" aria-label="Memuat statistik" className="animate-pulse space-y-5"><span className="sr-only">Memuat statistik…</span><div className="h-8 w-64 rounded bg-slate-200" /><div className="h-16 rounded-xl bg-slate-100" /><div className="h-80 rounded-2xl bg-slate-100" /><div className="grid gap-5 md:grid-cols-2"><div className="h-80 rounded-2xl bg-slate-100" /><div className="h-80 rounded-2xl bg-slate-100" /></div></div>;
}
