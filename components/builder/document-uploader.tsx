"use client";
import { useEffect, useRef, useState } from "react";

export function DocumentUploader({ pageId, onChange, onBusy }: { pageId: string; onChange: (file: { url: string; fileName: string }) => void; onBusy: (busy: boolean) => void }) {
  const changeRef = useRef(onChange); changeRef.current = onChange;
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  useEffect(() => () => xhrRef.current?.abort(), []);
  function upload(file: File) {
    setError("");
    if (!file.size || file.size > 10 * 1024 * 1024) { setError("Dokumen maksimal 10 MB dan tidak boleh kosong."); return; }
    const xhr = new XMLHttpRequest(); xhrRef.current = xhr;
    const form = new FormData(); form.append("file", file); form.append("pageId", pageId);
    xhr.open("POST", "/api/uploads/documents"); setProgress(0); onBusy(true);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => {
      try {
        const data: unknown = JSON.parse(xhr.responseText);
        if (xhr.status === 201 && data && typeof data === "object" && "url" in data && typeof data.url === "string" && "fileName" in data && typeof data.fileName === "string") changeRef.current({ url: data.url, fileName: data.fileName });
        else setError(data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Unggahan gagal.");
      } catch { setError("Sesi berakhir atau server tidak tersedia."); }
    };
    xhr.onerror = () => setError("Koneksi terputus. Coba unggah kembali.");
    xhr.onloadend = () => { setProgress(null); onBusy(false); xhrRef.current = null; };
    xhr.send(form);
  }
  return <div className="space-y-2"><label className="block text-sm font-medium">Unggah dokumen<input className="mt-2 block w-full text-sm" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" disabled={progress !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); e.target.value = ""; }} /></label><p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS, XLSX · maksimal 10 MB</p>{progress !== null && <div role="status"><progress value={progress} max={100} aria-label="Progres upload dokumen" className="w-full" /><span className="text-xs">{progress === 100 ? "Memeriksa dokumen…" : `Mengunggah ${progress}%`}</span></div>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
