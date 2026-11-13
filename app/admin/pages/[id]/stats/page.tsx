import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getPageStats } from "@/server/stats";
import { ScanCharts } from "@/components/admin/scan-charts";
import { pageIdSchema } from "@/lib/schemas/page";
import { AppError } from "@/server/errors";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function PageStats({ params, searchParams }: Props) {
  const user = await requireUser();
  const parsedId = pageIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();
  const query = await searchParams;
  const input = { range: one(query.range), from: one(query.from), to: one(query.to) };
  let stats;
  try { stats = await getPageStats(user, parsedId.data, input); }
  catch (error) { if (error instanceof AppError) notFound(); throw error; }
  const selected = stats.range;
  const exportQuery = new URLSearchParams({ range: selected.preset, from: selected.from, to: selected.to });
  const noScans = stats.total === 0;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/admin" className="text-sm text-muted-foreground hover:underline">← Semua halaman</Link><h1 className="mt-2 text-3xl font-bold">Statistik scan</h1><p className="mt-1 text-sm text-muted-foreground">{stats.page.title} · Semua waktu dalam WIB (Asia/Jakarta)</p></div><Button asChild variant="outline"><a href={`/api/pages/${stats.page.id}/stats/export?${exportQuery.toString()}`}>Ekspor CSV</a></Button></header>
    <form action={`/admin/pages/${stats.page.id}/stats`} className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
      <div><label htmlFor="range" className="mb-1 block text-sm font-medium">Rentang</label><select id="range" name="range" defaultValue={selected.preset} className="h-10 rounded-md border bg-white px-3"><option value="7d">7 hari</option><option value="30d">30 hari</option><option value="90d">90 hari</option><option value="custom">Kustom</option></select></div>
      <div><label htmlFor="from" className="mb-1 block text-sm font-medium">Dari</label><input id="from" name="from" type="date" defaultValue={selected.from} className="h-10 rounded-md border px-3" /></div>
      <div><label htmlFor="to" className="mb-1 block text-sm font-medium">Sampai</label><input id="to" name="to" type="date" defaultValue={selected.to} className="h-10 rounded-md border px-3" /></div>
      <Button type="submit" variant="outline">Terapkan</Button>
    </form>
    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950"><strong>{stats.total.toLocaleString("id-ID")}</strong> scan pada rentang {selected.from}–{selected.to} WIB</div>
    {noScans ? <section className="rounded-2xl border border-dashed bg-white px-6 py-16 text-center"><h2 className="text-xl font-semibold">Belum ada scan</h2><p className="mt-2 text-sm text-muted-foreground">Statistik akan tampil setelah ada pengunjung memindai QR halaman ini.</p></section> : <>
      <ScanCharts daily={stats.daily} devices={stats.devices} hours={stats.hours} />
      <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Sumber scan teratas</h2><ol className="mt-3 divide-y">{stats.referrers.map((row, index) => <li key={`${row.referrer}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="min-w-0 break-all">{row.referrer}</span><span className="shrink-0 tabular-nums">{row.scans.toLocaleString("id-ID")}</span></li>)}</ol></section>
    </>}
  </div>;
}
