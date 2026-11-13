"use client";
import type { ValidatedCard } from "@/lib/schemas/card";
import { ColorField, ContrastWarning, Field, Select } from "./fields";

export function StyleForm({ card, onChange }: { card: ValidatedCard; onChange: (card: ValidatedCard) => void }) {
  const patch = (values: Record<string, unknown>) => onChange({ ...card, style: { ...card.style, ...values } } as ValidatedCard);
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><ColorField label="Warna latar" value={card.style.backgroundColor} onChange={(backgroundColor) => patch({ backgroundColor })} /><ColorField label="Warna teks" value={card.style.textColor} onChange={(textColor) => patch({ textColor })} /></div><ContrastWarning text={card.style.textColor} background={card.style.backgroundColor} />
    <div className="grid grid-cols-2 gap-3"><Field label="Radius (px)" type="number" min={0} max={64} value={card.style.radius} onChange={(v) => patch({ radius: Number(v) })} /><Field label="Padding (px)" type="number" min={0} max={64} value={card.style.padding} onChange={(v) => patch({ padding: Number(v) })} /></div>
    <Select label="Bayangan" value={card.style.shadow} options={[["none", "Tanpa bayangan"], ["sm", "Kecil"], ["md", "Sedang"], ["lg", "Besar"]]} onChange={(shadow) => patch({ shadow })} />
    <Select label="Perataan" value={card.style.alignment} options={[["left", "Kiri"], ["center", "Tengah"], ["right", "Kanan"]]} onChange={(alignment) => patch({ alignment })} />
    <Select label="Ikon" value={card.style.icon ?? ""} options={[["", "Tanpa ikon"], ["link", "Tautan"], ["phone", "Telepon"], ["mail", "Email"], ["pin", "Lokasi"], ["download", "Unduh"], ["star", "Bintang"], ["heart", "Hati"]]} onChange={(icon) => patch({ icon: icon || undefined })} />
    {card.type === "TEXT" && <><Field label="Ukuran teks (px)" type="number" min={12} max={72} value={card.style.fontSize} onChange={(v) => patch({ fontSize: Number(v) })} /><Select label="Ketebalan teks" value={card.style.fontWeight} options={[["normal", "Normal"], ["medium", "Sedang"], ["bold", "Tebal"]]} onChange={(fontWeight) => patch({ fontWeight })} /></>}
    {card.type === "IMAGE" && <><Select label="Penyesuaian gambar" value={card.style.objectFit} options={[["cover", "Isi area"], ["contain", "Tampilkan utuh"]]} onChange={(objectFit) => patch({ objectFit })} /><Select label="Rasio gambar" value={card.style.aspectRatio} options={["auto", "16:9", "4:3", "1:1"]} onChange={(aspectRatio) => patch({ aspectRatio })} /></>}
    {card.type === "MAP" && <Field label="Tinggi peta (px)" type="number" min={150} max={800} value={card.style.height} onChange={(v) => patch({ height: Number(v) })} />}
    {card.type === "VIDEO_EMBED" && <Select label="Rasio video" value={card.style.aspectRatio} options={["16:9", "4:3", "1:1"]} onChange={(aspectRatio) => patch({ aspectRatio })} />}
    {card.type === "DIVIDER" && <><Select label="Gaya garis" value={card.style.lineStyle} options={[["solid", "Utuh"], ["dashed", "Putus-putus"], ["dotted", "Titik"], ["none", "Tanpa garis / spasi"]]} onChange={(lineStyle) => patch({ lineStyle })} /><Field label="Ketebalan garis (px)" type="number" min={1} max={8} value={card.style.thickness} onChange={(v) => patch({ thickness: Number(v) })} /></>}
    {card.type === "GALLERY" && <><Select label="Tata letak" value={card.style.layout} options={[["grid", "Grid"], ["carousel", "Carousel geser"]]} onChange={(layout) => patch({ layout })} /><Field label="Jumlah kolom" type="number" min={1} max={4} value={card.style.columns} onChange={(v) => patch({ columns: Number(v) })} /><Field label="Jarak gambar (px)" type="number" min={0} max={32} value={card.style.gap} onChange={(v) => patch({ gap: Number(v) })} /></>}
  </div>;
}
