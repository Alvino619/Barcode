"use client";
import { pageThemeSchema, type PageTheme } from "@/lib/schemas/page";
import { themePresets } from "@/lib/themes";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { ColorField, ContrastWarning, Field, Select } from "./fields";

export function ThemeForm({ theme, onChange, applyRadius, pageId, onBusy }: { pageId: string; onBusy: (busy: boolean) => void; theme: PageTheme; onChange: (theme: PageTheme) => void; applyRadius: () => void }) {
  const patch = (data: Partial<PageTheme>) => onChange({ ...theme, ...data });
  return <div className="space-y-5"><div><h2 className="font-semibold">Preset tema</h2><div className="mt-3 grid grid-cols-2 gap-2">{themePresets.map((preset) => <button type="button" key={preset.name} className="rounded-xl border px-3 py-4 text-left text-sm font-medium" style={{ background: preset.theme.backgroundColor, color: preset.theme.textColor }} onClick={() => onChange({ ...preset.theme, noIndex: theme.noIndex, showFooter: theme.showFooter })}>{preset.name}</button>)}</div></div>
    <div className="grid grid-cols-2 gap-3"><ColorField label="Warna latar" value={theme.backgroundColor} onChange={(backgroundColor) => patch({ backgroundColor })} /><ColorField label="Warna teks" value={theme.textColor} onChange={(textColor) => patch({ textColor })} /></div>
    <Select label="Gaya latar" value={theme.backgroundStyle} options={[["solid", "Warna solid"], ["gradient", "Gradasi"], ["dots", "Pola titik"], ["image", "Gambar"]]} onChange={(backgroundStyle) => patch({ backgroundStyle: backgroundStyle as PageTheme["backgroundStyle"] })} />
    {theme.backgroundStyle === "gradient" && <ColorField label="Warna akhir gradasi" value={theme.gradientColor} onChange={(gradientColor) => patch({ gradientColor })} />}
    {theme.backgroundStyle === "image" && <ImageUploader retainPending label="Gambar latar" value={theme.backgroundImage} pageId={pageId} onBusy={onBusy} onChange={(backgroundImage) => patch({ backgroundImage })} />}
    {theme.backgroundStyle === "image" && <p className="text-xs text-amber-900">Pastikan teks tetap kontras dengan gambar latar; rasio di bawah hanya menghitung warna latar dasar.</p>}
    <ContrastWarning text={theme.textColor} background={theme.backgroundColor} end={theme.backgroundStyle === "gradient" ? theme.gradientColor : undefined} />
    <Select label="Font halaman" value={theme.font} options={[["sans", "Sans (bawaan)"], ["serif", "Serif (lama)"], ["mono", "Mono (lama)"], ["inter", "Inter"], ["lora", "Lora"], ["roboto-mono", "Roboto Mono"], ["poppins", "Poppins"], ["nunito", "Nunito"], ["playfair", "Playfair Display"]]} onChange={(font) => patch({ font: font as PageTheme["font"] })} />
    <Field label="Lebar konten maksimum (px)" type="number" min={280} max={960} value={theme.contentWidth} onChange={(v) => patch({ contentWidth: Number(v) })} hint="Konten selalu mengikuti lebar layar bila layar lebih sempit." />
    <Field label="Jarak antar kartu (px)" type="number" min={0} max={64} value={theme.cardGap} onChange={(v) => patch({ cardGap: Number(v) })} />
    <Field label="Radius default kartu baru (px)" type="number" min={0} max={64} value={theme.defaultRadius} onChange={(v) => patch({ defaultRadius: Number(v) })} />
    <Button variant="outline" onClick={applyRadius}>Terapkan radius ke semua kartu</Button>
    <p className="text-xs text-muted-foreground">Warna dan tampilan khusus setiap kartu dapat diatur pada tab Tampilan.</p>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={theme.showFooter} onChange={(event) => patch({ showFooter: event.target.checked })} />Tampilkan footer Dibuat dengan QR Card Page</label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={theme.noIndex} onChange={(event) => patch({ noIndex: event.target.checked })} />Minta mesin pencari tidak mengindeks halaman (noindex)</label>
    <Button variant="outline" onClick={() => { if (window.confirm("Kembalikan tema ke pengaturan awal?")) onChange(pageThemeSchema.parse({ noIndex: theme.noIndex, showFooter: theme.showFooter })); }}>Reset tema</Button>
    {!pageThemeSchema.safeParse(theme).success && <p role="alert" className="text-sm text-destructive">Periksa format warna dan batas angka pada tema sebelum menyimpan.</p>}
  </div>;
}
