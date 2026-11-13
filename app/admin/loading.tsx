export default function Loading() {
  return <div role="status" aria-label="Memuat halaman" className="animate-pulse space-y-6"><span className="sr-only">Memuat halaman…</span><div className="h-9 w-56 rounded-lg bg-slate-200" /><div className="h-20 rounded-xl bg-slate-200/70" /><div className="space-y-3 rounded-2xl border bg-white p-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-20 rounded-lg bg-slate-100" />)}</div></div>;
}
