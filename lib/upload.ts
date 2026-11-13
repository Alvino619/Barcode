import { z } from "zod";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const uploadFileSchema = z.instanceof(File).refine((file) => file.size > 0, "File kosong.")
  .refine((file) => file.size <= MAX_IMAGE_SIZE, "Ukuran gambar maksimal 5 MB.");

export type ImageExtension = "jpg" | "png" | "webp";
export function validateImageBytes(bytes: Uint8Array): ImageExtension {
  z.number().min(1, "File kosong.").max(MAX_IMAGE_SIZE, "Ukuran gambar maksimal 5 MB.").parse(bytes.byteLength);
  const startsWith = (magic: number[]) => magic.every((value, index) => bytes[index] === value);
  if (bytes.length >= 12 && startsWith([0xff, 0xd8, 0xff])) return "jpg";
  if (bytes.length >= 24 && startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) &&
      new TextDecoder().decode(bytes.slice(12, 16)) === "IHDR") return "png";
  if (bytes.length >= 16 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP" &&
      ["VP8 ", "VP8L", "VP8X"].includes(new TextDecoder().decode(bytes.slice(12, 16)))) return "webp";
  throw new Error("Isi file harus berupa gambar JPEG, PNG, atau WebP. SVG tidak diizinkan.");
}
