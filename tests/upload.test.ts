import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { MAX_IMAGE_SIZE, uploadFileSchema, validateImageBytes } from "@/lib/upload";
import { LocalStorageProvider } from "@/lib/storage";
import type { StorageProvider } from "@/lib/storage";
import * as storageModule from "@/lib/storage";
import { imageKeySchema } from "@/lib/schemas/page";
import { POST, DELETE } from "@/app/api/uploads/route";
import { POST as uploadDocument } from "@/app/api/uploads/documents/route";
import { assertImageAccess } from "@/server/images";
import { deletePageInTransaction } from "@/server/page-deletion";
import type { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  storage: null as StorageProvider | null,
  create: vi.fn(),
  findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), referenced: vi.fn(),
  authorize: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { uploadedImage: { deleteMany: mocks.deleteMany } } }));
vi.mock("@/server/auth", () => ({ requireUser: async () => ({ id: "user-1", role: "USER" }) }));
vi.mock("@/server/page-access", () => ({ assertCanManagePage: mocks.authorize }));
vi.mock("@/server/page-transactions", () => ({
  pageTransaction: (work: (tx: unknown) => Promise<unknown>) => work({
    uploadedImage: { create: mocks.create, findUnique: mocks.findUnique, update: mocks.update },
    $queryRaw: mocks.referenced,
  }),
}));
vi.mock("@/lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof storageModule>()),
  getStorage: () => mocks.storage,
}));

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

describe("POST unggahan gambar", () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "barcode-upload-test-"));
    mocks.storage = new LocalStorageProvider(directory);
    mocks.create.mockReset().mockResolvedValue({});
    mocks.authorize.mockReset().mockResolvedValue(undefined);
  });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

  async function upload(data: Buffer, pageId?: string) {
    const form = new FormData();
    if (pageId) form.set("pageId", pageId);
    form.set("file", new File([new Uint8Array(data)], "image", { type: "application/octet-stream" }));
    const origin = new URL(process.env.NEXTAUTH_URL ?? "http://localhost").origin;
    return POST(new Request(`${origin}/api/uploads`, { method: "POST", headers: { origin }, body: form }));
  }

  it.each([
    ["JPEG besar", "jpeg", 3200, 1600, 1600, 800, false],
    ["PNG transparan", "png", 40, 20, 40, 20, true],
    ["WebP", "webp", 60, 30, 60, 30, false],
  ] as const)("mengonversi %s menjadi WebP", async (_name, format, width, height, expectedWidth, expectedHeight, alpha) => {
    const input = await sharp({ create: { width, height, channels: 4, background: { r: 40, g: 80, b: 120, alpha: alpha ? 0.5 : 1 } } }).toFormat(format).toBuffer();
    const response = await upload(input);
    expect(response.status).toBe(201);
    const { url } = await response.json();
    expect(url).toMatch(/^\/uploads\/[a-f0-9-]+\.webp$/);
    const output = await readFile(path.join(directory, path.basename(url)));
    const metadata = await sharp(output).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: expectedWidth, height: expectedHeight, hasAlpha: alpha });
    expect(mocks.authorize).toHaveBeenCalledTimes(2);
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({ url, ownerId: "user-1", sourcePageId: null });
  });

  it("mencatat halaman asal gambar dan dokumen sebelum dipasang", async () => {
    const pageId = "ckx1234567890123456789012";
    const input = await sharp({ create: { width: 1, height: 1, channels: 3, background: "red" } }).png().toBuffer();
    expect((await upload(input, pageId)).status).toBe(201);
    const form = new FormData();
    form.set("pageId", pageId);
    form.set("file", new File(["%PDF-1.7\n1 0 obj\nendobj\n%%EOF"], "example.pdf"));
    const origin = new URL(process.env.NEXTAUTH_URL ?? "http://localhost").origin;
    const response = await uploadDocument(new Request(`${origin}/api/uploads/documents`, { method: "POST", headers: { origin }, body: form }));
    expect(response.status).toBe(201);
    expect(mocks.create.mock.calls.map(([args]) => args.data.sourcePageId)).toEqual([pageId, pageId]);
  });

  it("menolak gambar terpotong tanpa menyimpan atau mendaftarkan file", async () => {
    const input = await sharp({ create: { width: 32, height: 32, channels: 3, background: "red" } }).png().toBuffer();
    const response = await upload(input.subarray(0, 16));
    expect(response.status).toBe(400);
    expect(await readdir(directory)).toEqual([]);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("menghapus hasil saat registri gagal", async () => {
    mocks.create.mockRejectedValue(new Error("registry failed"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const input = await sharp({ create: { width: 32, height: 32, channels: 3, background: "red" } }).png().toBuffer();
      expect((await upload(input)).status).toBe(500);
      expect(await readdir(directory)).toEqual([]);
      expect(mocks.create).toHaveBeenCalledOnce();
    } finally { consoleError.mockRestore(); }
  });
});

describe("penghapusan unggahan", () => {
  const key = "12345678-1234-4123-8123-123456789012.pdf";
  const url = `/uploads/${key}`;
  const image = { id: "file", key, url, ownerId: "user-1", deletingAt: null };
  const origin = new URL(process.env.NEXTAUTH_URL ?? "http://localhost").origin;
  const remove = () => DELETE(new Request(`${origin}/api/uploads`, { method: "DELETE", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ url }) }));

  it("mempertahankan marker setelah gagal unlink dan menolak pemakaian ulang sampai retry sukses", async () => {
    mocks.findUnique.mockResolvedValue(image);
    mocks.referenced.mockResolvedValue([{ used: false }]);
    mocks.update.mockClear();
    mocks.deleteMany.mockReset().mockResolvedValue({ count: 1 });
    const unlink = vi.fn().mockRejectedValueOnce(new Error("unlink failed")).mockResolvedValue(undefined);
    mocks.storage = { save: vi.fn(), delete: unlink, getUrl: vi.fn() };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await remove()).status).toBe(500);
      const deletingAt = mocks.update.mock.calls[0][0].data.deletingAt;
      expect(deletingAt).toBeInstanceOf(Date);
      expect(mocks.deleteMany).not.toHaveBeenCalled();
      mocks.findUnique.mockResolvedValue({ ...image, deletingAt });
      const tx = { uploadedImage: { findUnique: mocks.findUnique } } as unknown as Prisma.TransactionClient;
      for (const role of ["ADMIN", "EDITOR"] as const) {
        await expect(assertImageAccess(tx, { id: image.ownerId, role }, [url])).rejects.toMatchObject({ status: 400 });
      }
      expect(await (await remove()).json()).toEqual({ deleted: true });
      expect(mocks.update).toHaveBeenCalledTimes(1);
      expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: image.id, deletingAt } });
    } finally { log.mockRestore(); }
  });

  it("hanya mengklaim file terdaftar yang tak dipakai setelah halaman dihapus", async () => {
    const shared = "/uploads/shared.webp", pending = "/uploads/pending.pdf";
    const findMany = vi.fn().mockResolvedValue([image, { ...image, id: "shared", url: shared }, { ...image, id: "pending", url: pending }]);
    const removePage = vi.fn();
    const tx = {
      page: { findUniqueOrThrow: vi.fn().mockResolvedValue({ theme: { image: shared }, cards: [{ content: { file: url, link: "https://example.org/file.pdf" }, style: { image: shared } }] }), delete: removePage },
      uploadedImage: { findMany, update: vi.fn() },
      $queryRaw: async (_sql: TemplateStringsArray, candidate: string) => {
        expect(removePage).toHaveBeenCalledWith({ where: { id: "page" } });
        return [{ used: candidate === shared }];
      },
    };
    const claims = await deletePageInTransaction(tx as unknown as Prisma.TransactionClient, "page");
    expect(findMany.mock.calls[0][0].where.OR).toEqual([{ sourcePageId: "page" }, { url: { in: [shared, url] } }]);
    expect(claims.map(({ id }) => id)).toEqual(["file", "pending"]);
  });
});
