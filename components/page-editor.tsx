"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/image-uploader";
import { useToast } from "@/components/toast-provider";
import { apiRequest } from "@/lib/api-client";
import { generateSlug } from "@/lib/slug";
import { slugSchema, type PageInput } from "@/lib/schemas/page";

type EditorPage = PageInput & { id: string; cardCount: number; expiresAt: string | null };
const deadlineFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "long", timeStyle: "medium" });
const inputClass = "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

export function PageEditor({ page }: { page?: EditorPage }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<PageInput>(page ?? { title: "", slug: "", description: "", logo: null, coverImage: null, isPublished: false, lifetime: "temporary" });
  const [manualSlug, setManualSlug] = useState(Boolean(page));
  const [slugState, setSlugState] = useState({ available: false, checking: false, message: "Slug akan dibuat dari judul." });
  const [pending, setPending] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState("");
  const busy = pending || logoBusy || coverBusy;

  useEffect(() => {
    const valid = slugSchema.safeParse(form.slug);
    if (!valid.success) { setSlugState({ available: false, checking: false, message: form.slug ? valid.error.issues[0].message : "Slug akan dibuat dari judul." }); return; }
    const abort = new AbortController();
    setSlugState({ available: false, checking: true, message: "Memeriksa ketersediaan…" });
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({ slug: form.slug, ...(page ? { pageId: page.id } : {}) });
        const result = await apiRequest<{ available: boolean }>(`/api/pages/slug?${query}`, { signal: abort.signal });
        if (!abort.signal.aborted) setSlugState({ available: result.available, checking: false, message: result.available ? "Slug tersedia." : "Slug sudah digunakan atau tersimpan dalam riwayat halaman lain." });
      } catch (error) {
        if (!abort.signal.aborted) setSlugState({ available: false, checking: false, message: error instanceof Error ? error.message : "Pemeriksaan slug gagal." });
      }
    }, 400);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [form.slug, page]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    try {
      const { title, slug, description, logo, coverImage, isPublished, lifetime } = form;
      await apiRequest(page ? `/api/pages/${page.id}` : "/api/pages", { method: page ? "PATCH" : "POST", body: JSON.stringify({ title, slug, description, logo, coverImage, isPublished, lifetime }) });
      toast(page ? "Perubahan halaman berhasil disimpan." : "Halaman berhasil dibuat.");
      router.push("/admin"); router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Halaman gagal disimpan.";
      setError(message); toast(message, true); setPending(false);
    }
  }

  return <div className="space-y-8">
    <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Semua halaman</Link>
    <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Pengaturan halaman</p><h1 className="text-3xl font-bold tracking-tight">{page ? "Edit halaman" : "Buat halaman baru"}</h1><p className="mt-2 text-muted-foreground">Atur identitas, alamat, dan tampilan awal halaman Anda.</p></div>
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section className="space-y-6 rounded-2xl border bg-white p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Informasi halaman</h2>
        <div className="space-y-2"><label htmlFor="title" className="text-sm font-medium">Judul <span className="text-destructive">*</span></label><input id="title" required maxLength={200} disabled={pending} value={form.title} className={inputClass} placeholder="Contoh: Kedai Kopi Senja" onChange={(event) => { const title = event.target.value; setForm({ ...form, title, ...(!manualSlug ? { slug: title ? generateSlug(title) : "" } : {}) }); }} /></div>
        <div className="space-y-2"><label htmlFor="slug" className="text-sm font-medium">Alamat halaman (slug)</label><div className="flex items-center rounded-lg border bg-slate-50"><span className="pl-3 text-sm text-muted-foreground">/p/</span><input id="slug" required minLength={3} maxLength={60} disabled={pending} value={form.slug} className={`${inputClass} border-0 bg-transparent`} aria-describedby="slug-status" onChange={(event) => { setManualSlug(true); setForm({ ...form, slug: event.target.value }); }} /></div>
          <p id="slug-status" role="status" className={`text-xs ${slugState.available ? "text-emerald-700" : "text-muted-foreground"}`}>{slugState.message}</p>
          {page && form.slug !== page.slug && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Alamat halaman akan berubah. URL lama tetap berfungsi dan mengarah ke alamat terbaru selama halaman dipublikasikan.</p>}
        </div>
        <div className="space-y-2"><label htmlFor="description" className="text-sm font-medium">Deskripsi</label><textarea id="description" rows={5} maxLength={2000} disabled={pending} value={form.description} className={inputClass} placeholder="Ceritakan tentang halaman ini…" onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
        <fieldset disabled={pending} className="space-y-2">
          <legend className="text-sm font-semibold">Masa berlaku</legend>
          <div className="flex flex-wrap gap-x-6">
            {(["temporary", "permanent"] as const).map((mode) => (
              <label key={mode} htmlFor={`lifetime-${mode}`} className="inline-flex min-h-12 cursor-pointer items-center gap-2 text-sm">
                <input id={`lifetime-${mode}`} type="radio" name="lifetime" value={mode} checked={form.lifetime === mode} aria-describedby="lifetime-help" onChange={() => setForm({ ...form, lifetime: mode })} />
                {mode === "temporary" ? "Sementara (7 hari)" : "Permanen"}
              </label>
            ))}
          </div>
          <div id="lifetime-help" className="space-y-1 text-sm text-muted-foreground" role="status">
            {form.lifetime === "temporary" ? <>
              <p>{page?.expiresAt ? <>Batas waktu: <time dateTime={page.expiresAt}>{deadlineFormat.format(new Date(page.expiresAt))} WIB</time>.</> : "Batas waktu: 7 hari sejak perubahan disimpan."}</p>
              <p>Setelah batas waktu, halaman dan file yang hanya dipakai halaman ini akan dihapus otomatis. Mengedit halaman tidak memperpanjang masa berlaku.</p>
            </> : <p>Halaman tidak akan dihapus otomatis.</p>}
          </div>
        </fieldset>
        <div className="rounded-xl border bg-slate-50 p-4"><label className="flex cursor-pointer items-center justify-between gap-4"><span><span className="block text-sm font-semibold">Publikasikan halaman</span><span className="text-xs text-muted-foreground">Halaman draft hanya dapat dikelola di area admin.</span></span><input type="checkbox" role="switch" className="h-5 w-5 accent-emerald-700" checked={form.isPublished} disabled={pending} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} /></label>
          {form.isPublished && (page?.cardCount ?? 0) === 0 && <p className="mt-3 text-sm text-amber-800">Halaman ini belum memiliki kartu. Anda tetap dapat mempublikasikannya sekarang.</p>}
        </div>
      </section>
      <section className="space-y-7 rounded-2xl border bg-white p-5 sm:p-7"><h2 className="text-lg font-semibold">Identitas visual</h2>
        <ImageUploader label="Logo" value={form.logo} pageId={page?.id} disabled={pending} onBusy={setLogoBusy} onChange={(logo) => setForm((prev) => ({ ...prev, logo }))} />
        <ImageUploader label="Sampul" value={form.coverImage} pageId={page?.id} disabled={pending} onBusy={setCoverBusy} onChange={(coverImage) => setForm((prev) => ({ ...prev, coverImage }))} />
        <p className="text-xs text-muted-foreground">Perubahan gambar diterapkan setelah halaman disimpan.</p>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 lg:col-span-2">
        <p role="alert" className="text-sm text-destructive">{error}</p><div className="flex gap-3"><Button variant="outline" type="button" disabled={busy} onClick={() => router.push("/admin")}>Batal</Button><Button type="submit" disabled={busy || slugState.checking || !slugState.available}><Save className="h-4 w-4" />{pending ? "Menyimpan…" : "Simpan halaman"}</Button></div>
      </div>
    </form>
  </div>;
}
