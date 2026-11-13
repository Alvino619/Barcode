"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { MAX_IMAGE_SIZE } from "@/lib/upload";

type Props = { retainPending?: boolean; label: string; value: string | null; pageId?: string; disabled?: boolean; onChange: (url: string | null) => void; onBusy: (busy: boolean) => void };
export function ImageUploader({ retainPending = false, label, value, pageId, disabled, onChange, onBusy }: Props) {
  const id = useId();
  const changeRef = useRef(onChange); changeRef.current = onChange;
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const request = useRef<XMLHttpRequest | null>(null);
  const pendingUrls = useRef(new Set<string>());

  useEffect(() => () => {
    request.current?.abort();
    // Saved files are retained by the server reference check. Only unattached
    // uploads from this form can be removed on cancel/navigation.
    for (const url of retainPending ? [] : pendingUrls.current) {
      void fetch("/api/uploads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, pageId }), keepalive: true }).catch(() => {});
    }
  }, [pageId, retainPending]);

  async function discard(url: string | null) {
    if (retainPending || !url || !pendingUrls.current.has(url)) return;
    try { await apiRequest("/api/uploads", { method: "DELETE", body: JSON.stringify({ url, pageId }) }); pendingUrls.current.delete(url); }
    catch { /* Retain for the unmount retry; attached files are cleaned on save. */ }
  }

  function upload(file: File) {
    setError("");
    if (!file.size || file.size > MAX_IMAGE_SIZE) { setError("Pilih gambar berukuran 1 byte hingga 5 MB."); return; }
    const form = new FormData();
    form.append("file", file);
    if (pageId) form.append("pageId", pageId);
    const xhr = new XMLHttpRequest();
    request.current = xhr;
    xhr.open("POST", "/api/uploads");
    setProgress(0); onBusy(true);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => {
      try {
        const result: unknown = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && result && typeof result === "object" && "url" in result && typeof result.url === "string") {
          pendingUrls.current.add(result.url);
          void discard(value);
          changeRef.current(result.url);
        } else {
          setError(result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : "Unggahan gagal. Silakan coba lagi.");
        }
      } catch { setError("Sesi berakhir atau server tidak tersedia. Muat ulang halaman."); }
    };
    xhr.onerror = () => setError("Koneksi terputus saat mengunggah. Coba lagi.");
    xhr.onloadend = () => { setProgress(null); onBusy(false); request.current = null; };
    xhr.send(form);
  }

  return <div className="space-y-3">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    {value ? <div className="relative overflow-hidden rounded-xl border bg-slate-50">
      {/* User uploads require no optimizer and may be created after a production build. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={value} alt={`Pratinjau ${label.toLowerCase()}`} className="h-40 w-full object-contain" />
      <Button variant="outline" size="sm" type="button" disabled={disabled || progress !== null} className="absolute right-2 top-2 bg-white" onClick={() => { void discard(value); onChange(null); }}><X className="h-4 w-4" />Hapus</Button>
    </div> : <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-slate-50 text-muted-foreground"><Upload className="h-5 w-5" /><span className="text-xs">Belum ada {label.toLowerCase()}</span></div>}
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || progress !== null} aria-describedby={`${id}-hint`} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-foreground disabled:opacity-50" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = ""; }} />
    <p id={`${id}-hint`} className="text-xs text-muted-foreground">JPEG, PNG, atau WebP. Maksimal 5 MB.</p>
    {progress !== null && <div role="status" className="space-y-1"><progress className="h-2 w-full accent-emerald-700" value={progress} max={100} aria-label={`Progres unggah ${label}`} /><p className="text-xs">{progress === 100 ? "Memeriksa gambar…" : `Mengunggah ${progress}%`}</p></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
