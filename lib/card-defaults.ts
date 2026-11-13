import { cardSchema, type ValidatedCard } from "./schemas/card";

export const cardTypes = [
  { type: "TEXT", name: "Teks", description: "Judul dan cerita singkat", icon: "Type" },
  { type: "IMAGE", name: "Gambar", description: "Foto dengan keterangan", icon: "Image" },
  { type: "LINK_BUTTON", name: "Tombol tautan", description: "Arahkan ke situs atau kontak", icon: "Link" },
  { type: "CONTACT", name: "Kontak", description: "Telepon, email, dan WhatsApp", icon: "Contact" },
  { type: "MAP", name: "Peta", description: "Alamat dan lokasi Anda", icon: "MapPin" },
  { type: "SOCIAL", name: "Media sosial", description: "Kumpulan akun sosial", icon: "Share2" },
  { type: "VIDEO_EMBED", name: "Video", description: "YouTube atau Vimeo", icon: "Video" },
  { type: "FILE_DOWNLOAD", name: "Dokumen", description: "Unduh PDF atau dokumen Office", icon: "FileDown" },
  { type: "DIVIDER", name: "Pemisah", description: "Garis atau ruang kosong", icon: "Minus" },
  { type: "GALLERY", name: "Galeri", description: "Grid atau carousel gambar", icon: "Images" },
] as const;

export function newCard(type: ValidatedCard["type"], order: number, radius: number): ValidatedCard {
  const contents: Record<ValidatedCard["type"], object> = {
    TEXT: { title: "", text: "Tulis cerita Anda di sini." }, IMAGE: { url: "", alt: "", caption: "" },
    LINK_BUTTON: { label: "Kunjungi situs", url: "https://example.com", openInNewTab: true },
    CONTACT: { name: "Hubungi kami", email: "halo@example.com" }, MAP: { label: "Lokasi kami", latitude: -6.2, longitude: 106.8, zoom: 15 },
    SOCIAL: { links: [{ platform: "website", url: "https://example.com" }] },
    VIDEO_EMBED: { title: "Video kami", url: "" }, FILE_DOWNLOAD: { label: "Unduh dokumen", url: "", fileName: "dokumen.pdf" },
    DIVIDER: {}, GALLERY: { images: [] },
  };
  const branch = cardSchema.options.find((option) => option.shape.type.value === type)!;
  // New uploads/video start as incomplete local drafts. They must pass parse
  // before autosave or rendering; this assertion never bypasses server parsing.
  return { type, order, isVisible: true, content: contents[type], style: branch.shape.style.parse({ radius }) } as ValidatedCard;
}
