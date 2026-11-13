"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { apiRequest } from "@/lib/api-client";
import { QrCodeDialog } from "@/components/qr-code-dialog";

export function PageActions({ id, title, slug, logo }: { id: string; title: string; slug: string; logo: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const toast = useToast();

  async function duplicate() {
    setPending(true);
    try { await apiRequest(`/api/pages/${id}/duplicate`, { method: "POST" }); toast("Halaman berhasil diduplikat sebagai draft."); router.refresh(); }
    catch (error) { toast(error instanceof Error ? error.message : "Duplikasi gagal.", true); }
    finally { setPending(false); }
  }
  async function remove() {
    setPending(true); setError("");
    try { await apiRequest(`/api/pages/${id}`, { method: "DELETE", body: JSON.stringify({ title: confirmation }) }); dialog.current?.close(); toast("Halaman berhasil dihapus."); router.refresh(); }
    catch (error) { const message = error instanceof Error ? error.message : "Penghapusan gagal."; setError(message); toast(message, true); }
    finally { setPending(false); }
  }
  return <div className="flex flex-wrap items-center gap-1">
    <Button asChild variant="ghost" size="sm"><Link href={`/admin/pages/${id}/edit`} aria-label={`Edit ${title}`}><Pencil className="h-3.5 w-3.5" />Edit</Link></Button>
    <QrCodeDialog title={title} slug={slug} defaultLogo={logo} />
    <Button variant="ghost" size="sm" disabled={pending} onClick={duplicate} aria-label={`Duplikat ${title}`}><Copy className="h-3.5 w-3.5" />Duplikat</Button>
    <Button variant="ghost" size="sm" disabled={pending} className="text-destructive hover:bg-red-50 hover:text-destructive" aria-label={`Hapus ${title}`} onClick={() => { setConfirmation(""); setError(""); dialog.current?.showModal(); }}><Trash2 className="h-3.5 w-3.5" />Hapus</Button>
    <dialog ref={dialog} aria-labelledby={`delete-title-${id}`} className="w-[calc(100%-2rem)] max-w-md rounded-2xl border p-6 shadow-xl backdrop:bg-slate-950/40" onCancel={(event) => { if (pending) event.preventDefault(); }}>
      <h2 id={`delete-title-${id}`} className="text-xl font-bold">Hapus halaman?</h2><p className="my-4 text-sm text-muted-foreground">Halaman, kartu, riwayat slug, dan catatan scan akan dihapus permanen. Gambar yang masih dipakai halaman lain akan dipertahankan.</p>
      <label htmlFor={`confirm-${id}`} className="block text-sm">Ketik <strong className="break-words">{title}</strong> untuk konfirmasi.</label>
      <input id={`confirm-${id}`} autoComplete="off" disabled={pending} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="my-3 w-full rounded-lg border px-3 py-2 focus:outline-primary" />
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={pending} onClick={() => dialog.current?.close()}>Batal</Button><Button className="bg-destructive hover:bg-destructive/90" disabled={pending || confirmation !== title} onClick={remove}>{pending ? "Menghapus…" : "Hapus permanen"}</Button></div>
    </dialog>
  </div>;
}
