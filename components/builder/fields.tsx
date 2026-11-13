"use client";
import { useId } from "react";
import { contrastRatio } from "@/lib/card-links";

export const fieldClass = "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
export function Field({ label, value, onChange, multiline = false, type = "text", min, max, step, hint }: { label: string; value: string | number; onChange: (value: string) => void; multiline?: boolean; type?: string; min?: number; max?: number; step?: string | number; hint?: string }) {
  const id = useId();
  return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-medium">{label}</label>{multiline ? <textarea id={id} rows={4} className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)} /> : <input id={id} type={type} min={min} max={max} step={step} className={fieldClass} value={typeof value === "number" && !Number.isFinite(value) ? "" : value} onChange={(e) => onChange(e.target.value)} />}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}
export function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly (string | readonly [string, string])[]; onChange: (value: string) => void }) {
  const id = useId();
  return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-medium">{label}</label><select id={id} className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => { const [key, title] = typeof o === "string" ? [o, o] : o; return <option key={key} value={key}>{title}</option>; })}</select></div>;
}
export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return <div><label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label><div className="flex gap-2"><input aria-label={`Pilih ${label.toLowerCase()}`} type="color" value={/^#[\da-f]{6}$/i.test(value) ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded border" /><input id={id} className={fieldClass} value={value} maxLength={7} onChange={(e) => onChange(e.target.value)} /></div></div>;
}
export function ContrastWarning({ text, background, end }: { text: string; background: string; end?: string }) {
  if (![text, background, ...(end ? [end] : [])].every((v) => /^#[\da-f]{6}$/i.test(v))) return null;
  const samples = end ? Array.from({ length: 21 }, (_, i) => "#" + [1, 3, 5].map((offset) => Math.round(parseInt(background.slice(offset, offset + 2), 16) * (1 - i / 20) + parseInt(end.slice(offset, offset + 2), 16) * i / 20).toString(16).padStart(2, "0")).join("")) : [background];
  const ratio = Math.min(...samples.map((color) => contrastRatio(text, color)));
  return ratio < 4.5 ? <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Kontras rendah ({ratio.toFixed(2)}:1). Gunakan warna dengan rasio minimal 4,5:1 agar teks lebih mudah dibaca.</p> : <p className="text-xs text-emerald-700">Kontras teks {ratio.toFixed(2)}:1.</p>;
}
