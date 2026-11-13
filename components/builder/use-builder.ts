"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { builderDocumentSchema, type BuilderDocument, type BuilderState } from "@/lib/schemas/builder";
import { apiRequest } from "@/lib/api-client";

export function useBuilder(pageId: string, initial: BuilderState) {
  const [document, setDocument] = useState(initial.document);
  const [saved, setSaved] = useState(JSON.stringify(initial.document));
  const [status, setStatus] = useState("Tersimpan");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const current = useRef(document);
  const version = useRef(initial.updatedAt);
  const inFlight = useRef(false);
  const failed = useRef(false);
  const savedRef = useRef(saved);
  const uploadRef = useRef(uploading);
  const conflictRef = useRef(conflict);
  current.current = document; uploadRef.current = uploading; conflictRef.current = conflict;
  const dirty = JSON.stringify(document) !== saved;

  const change = useCallback((update: (previous: BuilderDocument) => BuilderDocument) => {
    failed.current = false;
    setError("");
    setDocument((previous) => update(previous));
    setStatus("Perubahan belum tersimpan");
  }, []);
  const onBusy = useCallback((busy: boolean) => setUploading((count) => Math.max(0, count + (busy ? 1 : -1))), []);

  const save = useCallback(async () => {
    if (inFlight.current || failed.current || conflictRef.current || uploadRef.current) return;
    const snapshot = current.current;
    const encoded = JSON.stringify(snapshot);
    if (encoded === savedRef.current) { setStatus("Tersimpan"); return; }
    const parsed = builderDocumentSchema.safeParse(snapshot);
    if (!parsed.success) { setStatus("Lengkapi isian yang belum valid"); return; }
    inFlight.current = true; setSaving(true); setStatus("Menyimpan...");
    try {
      const response = await fetch(`/api/pages/${pageId}/builder`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updatedAt: version.current, document: parsed.data }),
      });
      if (response.redirected) throw new Error("Sesi berakhir. Masuk kembali untuk menyimpan.");
      const result: unknown = await response.json();
      if (response.status === 409 && result && typeof result === "object" && "code" in result && result.code === "VERSION_CONFLICT" && "updatedAt" in result && typeof result.updatedAt === "string") {
        conflictRef.current = result.updatedAt; setConflict(result.updatedAt); setStatus("Konflik versi"); return;
      }
      if (!response.ok || !result || typeof result !== "object" || !("updatedAt" in result) || typeof result.updatedAt !== "string") {
        throw new Error(result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : "Penyimpanan gagal. Periksa koneksi Anda.");
      }
      version.current = result.updatedAt;
      savedRef.current = encoded; setSaved(encoded);
      setStatus(JSON.stringify(current.current) === encoded ? "Tersimpan" : "Perubahan belum tersimpan");
    } catch (error) {
      failed.current = true; setStatus("Gagal menyimpan (coba lagi)");
      setError(error instanceof Error ? error.message : "Penyimpanan gagal.");
    } finally {
      inFlight.current = false; setSaving(false); setTick((v) => v + 1);
    }
  }, [pageId]);

  useEffect(() => {
    if (uploading) { setStatus("Menunggu unggahan..."); return; }
    const timer = setTimeout(() => { void save(); }, 700);
    return () => clearTimeout(timer);
  }, [document, uploading, tick, save]);

  useEffect(() => {
    if (!dirty && !saving && !uploading) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const guardLinks = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download") || link.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("Perubahan belum tersimpan. Tetap meninggalkan editor?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    window.document.addEventListener("click", guardLinks, true);
    return () => { window.removeEventListener("beforeunload", warn); window.document.removeEventListener("click", guardLinks, true); };
  }, [dirty, saving, uploading]);

  async function reload() {
    try {
      const latest = await apiRequest<BuilderState>(`/api/pages/${pageId}/builder`);
      const valid = builderDocumentSchema.parse(latest.document);
      version.current = latest.updatedAt; current.current = valid; setDocument(valid);
      savedRef.current = JSON.stringify(valid); setSaved(savedRef.current);
      conflictRef.current = null; setConflict(null); failed.current = false;
      setError(""); setStatus("Tersimpan");
    } catch { setError("Gagal memuat versi terbaru. Coba lagi."); }
  }
  function overwrite() {
    if (!conflictRef.current) return;
    // Still compare-and-swap against the version shown by the conflict dialog.
    // A third writer will cause another conflict instead of silent data loss.
    version.current = conflictRef.current;
    conflictRef.current = null; setConflict(null); failed.current = false;
    setTick((v) => v + 1);
  }
  function retry() { failed.current = false; setError(""); setTick((v) => v + 1); }
  return { document, change, dirty, saving, uploading, onBusy, status, error, conflict, reload, overwrite, retry };
}
