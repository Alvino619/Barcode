import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { MAX_IMAGE_SIZE, uploadFileSchema, validateImageBytes } from "@/lib/upload";
import { LocalStorageProvider } from "@/lib/storage";
import { imageKeySchema } from "@/lib/schemas/page";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
describe("validasi unggahan", () => {
  it("mengenali PNG nyata dari isi file meski MIME/ekstensi berbohong", async () => {
    const file = new File([png], "foto.txt", { type: "text/plain" });
    expect(uploadFileSchema.parse(file)).toBe(file);
    expect(validateImageBytes(new Uint8Array(await file.arrayBuffer()))).toBe("png");
  });
  it("mengenali signature JPEG dan WebP", () => {
    expect(validateImageBytes(Uint8Array.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1]))).toBe("jpg");
    expect(validateImageBytes(Buffer.from("RIFF0000WEBPVP8 0000"))).toBe("webp");
  });
  it("menolak SVG, GIF, file palsu, dan header terpotong", () => {
    for (const bytes of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), Buffer.from("GIF89a"), Buffer.from("bukan gambar"), png.subarray(0, 8)]) {
      expect(() => validateImageBytes(bytes)).toThrow();
    }
    expect(uploadFileSchema.safeParse("not-a-file").success).toBe(false);
  });
  it("menerima batas 5 MB dan menolak lebih besar atau kosong", () => {
    const bytes = new Uint8Array(MAX_IMAGE_SIZE); bytes.set(png);
    expect(validateImageBytes(bytes)).toBe("png");
    expect(() => validateImageBytes(new Uint8Array(MAX_IMAGE_SIZE + 1))).toThrow();
    expect(() => validateImageBytes(new Uint8Array())).toThrow();
    expect(uploadFileSchema.safeParse(new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], "large.png")).success).toBe(false);
  });
  it("provider memakai UUID, menolak traversal, dan menghapus secara idempoten", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "barcode-storage-test-"));
    try {
      const storage = new LocalStorageProvider(directory);
      const saved = await storage.save(png, "png");
      expect(imageKeySchema.safeParse(saved.key).success).toBe(true);
      expect(saved.url).toBe(`/uploads/${saved.key}`);
      expect(await readFile(path.join(directory, saved.key))).toEqual(png);
      await expect(storage.delete("../../secret")).rejects.toThrow();
      await storage.delete(saved.key); await storage.delete(saved.key);
      await expect(readFile(path.join(directory, saved.key))).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
