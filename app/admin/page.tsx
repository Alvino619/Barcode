import Link from "next/link";
import { FileText, Plus, Search } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listPages } from "@/server/pages";
import { pageQuerySchema } from "@/lib/schemas/page";
import { Button } from "@/components/ui/button";
import { PageActions } from "@/components/page-actions";
import { getDashboardStats } from "@/server/stats";

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const parsed = pageQuerySchema.safeParse(await searchParams);
  const [{ pages, total, currentPage, totalPages, query }, stats] = await Promise.all([
    listPages(user, parsed.success ? parsed.data : {}), getDashboardStats(user),
  ]);
  const linkToPage = (page: number) => `/admin?${new URLSearchParams({ q: query.q, status: query.status, page: String(page) })}`;
  const filtered = Boolean(query.q || query.status !== "all");
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Ruang pengelola</p><h1 className="text-3xl font-bold tracking-tight">Halaman Anda</h1><p className="mt-2 text-sm text-muted-foreground">{user.role === "ADMIN" ? "Kelola seluruh halaman, identitas, dan status publikasi." : "Kelola halaman milik Anda dalam satu tempat."}</p></div>
      <Button asChild><Link href="/admin/pages/new"><Plus className="h-4 w-4" />Buat halaman</Link></Button>
    </div>
    <section aria-label="Ringkasan statistik scan" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-xl border bg-white p-4"><p className="text-sm text-muted-foreground">Total scan</p><p className="mt-1 text-2xl font-bold tabular-nums">{stats.total.toLocaleString("id-ID")}</p></article>
      <article className="rounded-xl border bg-white p-4"><p className="text-sm text-muted-foreground">7 hari terakhir</p><p className="mt-1 text-2xl font-bold tabular-nums">{stats.last7.toLocaleString("id-ID")}</p></article>
      <article className="rounded-xl border bg-white p-4"><p className="text-sm text-muted-foreground">30 hari terakhir</p><p className="mt-1 text-2xl font-bold tabular-nums">{stats.last30.toLocaleString("id-ID")}</p></article>
      <article className="rounded-xl border bg-white p-4"><p className="text-sm text-muted-foreground">Halaman terpopuler</p>{stats.popular ? <><Link href={`/admin/pages/${stats.popular.id}/stats`} className="mt-1 block truncate font-semibold text-primary hover:underline">{stats.popular.title}</Link><p className="text-xs text-muted-foreground">{stats.popular.scans.toLocaleString("id-ID")} scan</p></> : <p className="mt-1 font-semibold">Belum ada scan</p>}</article>
    </section>
    <div className="rounded-2xl border bg-white">
      <form action="/admin" className="flex flex-wrap items-end gap-3 border-b p-4 sm:p-5">
        <div className="min-w-48 flex-1"><label htmlFor="search" className="mb-2 block text-xs font-medium text-muted-foreground">Cari halaman</label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input id="search" name="q" defaultValue={query.q} maxLength={100} placeholder="Judul atau slug…" className="h-10 w-full rounded-lg border pl-9 pr-3 text-sm focus:outline-primary" /></div></div>
        <div><label htmlFor="status" className="mb-2 block text-xs font-medium text-muted-foreground">Status</label><select id="status" name="status" defaultValue={query.status} className="h-10 rounded-lg border bg-white px-3 text-sm focus:outline-primary"><option value="all">Semua status</option><option value="published">Dipublikasikan</option><option value="draft">Draft</option></select></div>
        <Button variant="outline" type="submit">Terapkan</Button>{filtered && <Button asChild variant="ghost"><Link href="/admin">Reset</Link></Button>}
      </form>
      {!parsed.success && <p role="alert" className="px-5 pt-4 text-sm text-destructive">Filter tidak valid. Menampilkan daftar tanpa filter.</p>}
      {pages.length === 0 ? <div className="flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 rounded-2xl bg-slate-50 p-4"><FileText className="h-8 w-8 text-primary" /></div><h2 className="text-lg font-semibold">{filtered ? "Belum ada hasil yang cocok" : "Mulai dengan halaman pertama"}</h2><p className="mb-6 mt-2 max-w-md text-sm text-muted-foreground">{filtered ? "Coba kata kunci lain atau ubah filter status." : "Beri nama, pilih alamat, lalu tambahkan logo dan sampul halaman Anda."}</p><Button asChild variant="outline"><Link href={filtered ? "/admin" : "/admin/pages/new"}>{filtered ? "Hapus filter" : "Buat halaman"}</Link></Button>
      </div> : <div className="overflow-x-auto"><table className="block w-full text-left text-sm lg:table">
        <caption className="sr-only">Daftar halaman yang dapat Anda kelola</caption>
        <thead className="hidden bg-slate-50/70 text-xs text-muted-foreground lg:table-header-group"><tr>{["Halaman", "Status", "Scan", "Terakhir diubah (WIB)", "Aksi"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody className="block divide-y lg:table-row-group">{pages.map((page) => <tr key={page.id} className="grid gap-3 p-5 hover:bg-slate-50/50 lg:table-row lg:p-0">
          <td className="block min-w-0 lg:table-cell lg:max-w-56 lg:px-4 lg:py-5"><Link href={`/admin/pages/${page.id}/edit`} className="block break-words font-semibold hover:text-primary">{page.title}</Link><p className="mt-1 break-all text-xs text-muted-foreground">/p/{page.slug}</p></td>
          <td className="block lg:table-cell lg:px-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${page.isPublished ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{page.isPublished ? "Dipublikasikan" : "Draft"}</span></td>
          <td className="block tabular-nums lg:table-cell lg:px-4">{page._count.scanLogs.toLocaleString("id-ID")}<span className="text-muted-foreground lg:hidden"> scan</span></td>
          <td className="block text-xs text-muted-foreground lg:table-cell lg:px-4"><span className="lg:hidden">Diubah </span>{dateFormat.format(page.updatedAt)}<span className="lg:hidden"> WIB</span></td>
          <td className="block lg:table-cell lg:px-4"><PageActions id={page.id} title={page.title} slug={page.slug} logo={page.logo} /></td>
        </tr>)}</tbody>
      </table></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-sm"><p className="text-muted-foreground">{total.toLocaleString("id-ID")} halaman · Halaman {currentPage} dari {totalPages}</p><nav aria-label="Paginasi halaman" className="flex gap-2">{currentPage > 1 ? <Button asChild size="sm" variant="outline"><Link href={linkToPage(currentPage - 1)}>Sebelumnya</Link></Button> : <Button size="sm" variant="outline" disabled>Sebelumnya</Button>}{currentPage < totalPages ? <Button asChild size="sm" variant="outline"><Link href={linkToPage(currentPage + 1)}>Berikutnya</Link></Button> : <Button size="sm" variant="outline" disabled>Berikutnya</Button>}</nav></div>
    </div>
  </div>;
}
