"use client";

import { useEffect, useRef, useState } from "react";
import { Download, QrCode, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveQrBaseUrl } from "@/lib/app-url";
import { contrastRatio } from "@/lib/card-links";

type Correction = "L" | "M" | "Q" | "H";
type QrInstance = {
  append(node: HTMLElement): void;
  download(options: { name: string; extension: "png" | "svg" }): Promise<void>;
  getRawData(extension: "png"): Promise<Blob | Uint8Array | null>;
};
const luminance = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);

export function QrCodeDialog({ title, slug, defaultLogo }: { title: string; slug: string; defaultLogo?: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QrInstance | null>(null);
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#ffffff");
  const [size, setSize] = useState(512);
  const [margin, setMargin] = useState(24);
  const [correction, setCorrection] = useState<Correction>("M");
  const [rounded, setRounded] = useState(false);
  const [logo, setLogo] = useState(defaultLogo ?? "");
  const [logoSize, setLogoSize] = useState(0.16);
  const [status, setStatus] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const url = baseUrl ? `${baseUrl}/r/${slug}` : "";
  useEffect(() => {
    setBaseUrl(resolveQrBaseUrl(window.location.origin));
  }, []);
  const logoValid = !logo || (() => {
    if (logo.startsWith("/uploads/")) return /^\/uploads\/[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(logo);
    try { return ["http:", "https:"].includes(new URL(logo).protocol); } catch { return false; }
  })();
  const contrast = contrastRatio(foreground, background);
  const lighterForeground = luminance(foreground) > luminance(background);
  const effectiveCorrection: Correction = logo && ["L", "M"].includes(correction) ? "Q" : correction;

  function options(width = size) {
    return {
      type: "svg" as const, width, height: width, margin, data: url,
      qrOptions: { errorCorrectionLevel: effectiveCorrection },
      dotsOptions: { color: foreground, type: rounded ? "rounded" as const : "square" as const },
      cornersSquareOptions: { color: foreground }, cornersDotOptions: { color: foreground },
      backgroundOptions: { color: background },
      ...(logo && logoValid ? { image: logo, imageOptions: { hideBackgroundDots: true, imageSize: logoSize, margin: 4, crossOrigin: "anonymous" } } : {}),
    };
  }

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    void import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !preview.current) return;
      const qr = new QRCodeStyling(options());
      preview.current.replaceChildren();
      qr.append(preview.current);
      qrRef.current = qr as unknown as QrInstance;
    }).catch(() => setStatus("Pratinjau QR gagal dimuat. Muat ulang dialog."));
    return () => { cancelled = true; qrRef.current = null; };
  // options is intentionally represented by its values so the library redraws the preview on edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, foreground, background, size, margin, effectiveCorrection, rounded, logo, logoSize, logoValid]);

  async function downloadImage(extension: "png" | "svg") {
    setStatus("Menyiapkan unduhan…");
    try {
      const { default: QRCodeStyling } = await import("qr-code-styling");
      const qr = new QRCodeStyling(options(extension === "png" ? 1024 : size));
      await qr.download({ name: `qr-${slug}`, extension });
      setStatus(`${extension.toUpperCase()} berhasil diunduh.`);
    } catch { setStatus("Unduhan gagal. Coba lagi."); }
  }

  async function downloadPdf() {
    setStatus("Menyiapkan PDF…");
    try {
      const [{ default: QRCodeStyling }, { PDFDocument, StandardFonts }] = await Promise.all([import("qr-code-styling"), import("pdf-lib")]);
      const qr = new QRCodeStyling(options(1024));
      const png = await qr.getRawData("png");
      if (!png) throw new Error("QR tidak tersedia");
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([595.28, 841.89]);
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const pngBytes = png instanceof Blob ? new Uint8Array(await png.arrayBuffer()) : new Uint8Array(png);
      const image = await pdf.embedPng(pngBytes);
      const qrSize = 380;
      page.drawImage(image, { x: (page.getWidth() - qrSize) / 2, y: 310, width: qrSize, height: qrSize });
      page.drawText(title.slice(0, 100), { x: 48, y: 770, size: 22, font, maxWidth: 499 });
      page.drawText(url, { x: 48, y: 282, size: 10, font, maxWidth: 499 });
      page.drawText("Pindai QR untuk membuka halaman", { x: 48, y: 250, size: 12, font, maxWidth: 499 });
      const saved = await pdf.save();
      const stableBuffer = new ArrayBuffer(saved.byteLength);
      new Uint8Array(stableBuffer).set(saved);
      const blob = new Blob([stableBuffer], { type: "application/pdf" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `qr-${slug}.pdf`; link.click(); URL.revokeObjectURL(link.href);
      setStatus("PDF siap cetak berhasil diunduh.");
    } catch { setStatus("Pembuatan PDF gagal. Coba lagi."); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(url); setStatus("Tautan QR disalin."); }
    catch { setStatus("Tidak dapat menyalin tautan. Salin URL yang tampil secara manual."); }
  }

  return <>
    <Button type="button" variant="outline" size="sm" disabled={!url} onClick={() => { setStatus(""); dialog.current?.showModal(); }} aria-label={`Buat QR untuk ${title}`}><QrCode className="h-4 w-4" />QR Code</Button>
    <dialog ref={dialog} aria-labelledby={`qr-title-${slug}`} className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto rounded-2xl border bg-white p-0 shadow-xl backdrop:bg-slate-950/50" onClose={() => setStatus("")}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><div><h2 id={`qr-title-${slug}`} className="text-xl font-bold">QR Code · {title}</h2><p className="text-xs text-muted-foreground">URL tetap: {url}</p></div><Button variant="ghost" size="icon" aria-label="Tutup dialog QR" onClick={() => dialog.current?.close()}><X className="h-4 w-4" /></Button></div>
      <div className="grid gap-6 p-5 md:grid-cols-[280px_1fr]">
        <div className="space-y-3"><div ref={preview} aria-label="Pratinjau QR code" className="mx-auto aspect-square w-full max-w-[256px] overflow-hidden rounded-lg border bg-white p-2 [&_canvas]:!h-auto [&_canvas]:!w-full [&_svg]:!h-auto [&_svg]:!w-full" />
          <div className="flex flex-wrap justify-center gap-2"><Button size="sm" onClick={() => void downloadImage("png")} disabled={!logoValid}><Download className="h-4 w-4" />PNG 1024px</Button><Button size="sm" variant="outline" onClick={() => void downloadImage("svg")} disabled={!logoValid}>SVG</Button><Button size="sm" variant="outline" onClick={() => void downloadPdf()} disabled={!logoValid}>PDF cetak</Button></div>
        </div>
        <div className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium" htmlFor={`qr-colors-${slug}`}>Warna QR</label><div id={`qr-colors-${slug}`} className="flex gap-4"><label className="flex items-center gap-2 text-sm">Depan <input aria-label="Warna foreground QR" type="color" value={foreground} onChange={(e) => setForeground(e.target.value)} /></label><label className="flex items-center gap-2 text-sm">Latar <input aria-label="Warna background QR" type="color" value={background} onChange={(e) => setBackground(e.target.value)} /></label></div></div>
          <label className="block text-sm">Ukuran unduhan <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="ml-2 rounded border px-2 py-1"><option value={256}>256 px</option><option value={512}>512 px</option><option value={1024}>1024 px</option></select></label>
          <label className="block text-sm">Margin <input type="range" min={0} max={64} step={4} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="ml-2 align-middle" /> {margin}px</label>
          <label className="block text-sm">Koreksi error <select value={correction} onChange={(e) => setCorrection(e.target.value as Correction)} className="ml-2 rounded border px-2 py-1"><option value="L">L · 7%</option><option value="M">M · 15%</option><option value="Q">Q · 25%</option><option value="H">H · 30%</option></select></label>
          {logo && ["L", "M"].includes(correction) && <p className="text-xs text-amber-800">Logo membutuhkan koreksi error minimal Q; QR otomatis memakai Q.</p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rounded} onChange={(e) => setRounded(e.target.checked)} />Modul bulat</label>
          <div><label className="mb-1 block text-sm font-medium" htmlFor={`qr-logo-${slug}`}>Logo tengah opsional (URL gambar)</label><input id={`qr-logo-${slug}`} value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="/uploads/… atau https://…" className="w-full rounded-md border px-3 py-2 text-sm" />{logo && <label className="mt-2 block text-xs">Ukuran logo (maks. 20%) <input type="range" min={8} max={20} value={Math.round(logoSize * 100)} onChange={(e) => setLogoSize(Number(e.target.value) / 100)} className="ml-2 align-middle" /> {Math.round(logoSize * 100)}%</label>}{!logoValid && <p role="alert" className="mt-1 text-xs text-destructive">Gunakan URL gambar HTTP(S) atau unggahan lokal.</p>}</div>
          {(contrast < 4.5 || lighterForeground) && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Kontras QR rendah atau warna depannya lebih terang daripada latar. QR mungkin sulit dipindai; gunakan warna depan lebih gelap.</p>}
          <Button variant="outline" onClick={() => void copyLink()}><Copy className="h-4 w-4" />Salin tautan</Button>
          <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-muted-foreground">QR tetap berfungsi jika slug halaman diubah. QR tidak berfungsi bila halaman dihapus atau diubah menjadi draft.</p>
          {status && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{status}</p>}
        </div>
      </div>
    </dialog>
  </>;
}
