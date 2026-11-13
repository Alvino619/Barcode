import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { uploadKeySchema } from "./schemas/page";
import type { ImageExtension } from "./upload";
export type StorageExtension = ImageExtension | "pdf" | "doc" | "docx" | "xls" | "xlsx";

export interface StorageProvider {
  save(data: Uint8Array, extension: StorageExtension): Promise<{ key: string; url: string }>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private directory = path.join(process.cwd(), "public", "uploads")) {}

  async save(data: Uint8Array, extension: StorageExtension) {
    const key = uploadKeySchema.parse(`${randomUUID()}.${extension}`);
    await mkdir(this.directory, { recursive: true });
    await writeFile(path.join(this.directory, key), data, { flag: "wx" });
    return { key, url: this.getUrl(key) };
  }

  async delete(key: string) {
    const safeKey = uploadKeySchema.parse(key);
    try { await unlink(path.join(this.directory, safeKey)); }
    catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  }

  getUrl(key: string) { return `/uploads/${uploadKeySchema.parse(key)}`; }
}

export function getStorage(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider === "local") return new LocalStorageProvider();
  throw new Error(`Storage provider ${provider} belum tersedia.`);
}
