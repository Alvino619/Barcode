import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { prunePages } from "@/server/prune-pages";

const db = vi.hoisted(() => ({
  pages: vi.fn(), files: vi.fn(), tx: { page: { findUnique: vi.fn() } },
  deletePage: vi.fn(), finalizeFile: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  page: { findMany: db.pages }, uploadedImage: { findMany: db.files },
} }));
vi.mock("@/server/page-transactions", () => ({
  pageTransaction: (work: (tx: typeof db.tx) => Promise<boolean>) => work(db.tx),
}));
vi.mock("@/server/page-deletion", () => ({ deletePageInTransaction: db.deletePage }));
vi.mock("@/server/images", () => ({ finalizeImageDeletion: db.finalizeFile }));

const cutoff = new Date("2026-11-20T00:00:00.000Z");
beforeEach(() => {
  vi.resetAllMocks();
  db.files.mockResolvedValue([]);
});
afterEach(() => vi.restoreAllMocks());

it("memeriksa kembali tenggat di dalam lock dan melewati kandidat yang batal kedaluwarsa", async () => {
  db.pages.mockResolvedValue(["permanent", "extended", "gone", "expired"].map((id) => ({ id, expiresAt: cutoff })));
  db.tx.page.findUnique.mockResolvedValueOnce({ expiresAt: null })
    .mockResolvedValueOnce({ expiresAt: new Date(cutoff.getTime() + 1) })
    .mockResolvedValueOnce(null).mockResolvedValueOnce({ expiresAt: cutoff });
  expect(await prunePages(cutoff)).toEqual({ pagesDeleted: 1, pagesFailed: 0, filesDeleted: 0, filesFailed: 0 });
  expect(db.deletePage).toHaveBeenCalledTimes(1);
  expect(db.deletePage).toHaveBeenCalledWith(db.tx, "expired");
});

it("meneruskan kedua lintasan setelah kegagalan, tanpa cursor pada row yang telah dihapus", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const rows = Array.from({ length: 101 }, (_, n) => ({ id: String(n).padStart(3, "0"), expiresAt: cutoff }));
  db.pages.mockResolvedValueOnce(rows.slice(0, 100)).mockResolvedValueOnce(rows.slice(100));
  db.tx.page.findUnique.mockResolvedValue({ expiresAt: cutoff });
  db.deletePage.mockRejectedValueOnce(new Error("transaction failed"));
  const files = rows.map(({ id }) => ({ id, key: `${id}.pdf`, deletingAt: cutoff }));
  db.files.mockResolvedValueOnce(files.slice(0, 100)).mockResolvedValueOnce(files.slice(100));
  db.finalizeFile.mockResolvedValue(true).mockRejectedValueOnce(new Error("unlink failed"))
    .mockResolvedValueOnce(false); // Already finalized by another run.

  expect(await prunePages(cutoff)).toEqual({ pagesDeleted: 100, pagesFailed: 1, filesDeleted: 99, filesFailed: 1 });
  expect(db.pages).toHaveBeenNthCalledWith(2, expect.objectContaining({
    take: 100, orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
    where: { expiresAt: { lte: cutoff }, OR: [{ expiresAt: { gt: cutoff } }, { expiresAt: cutoff, id: { gt: "099" } }] },
  }));
  expect(db.files).toHaveBeenNthCalledWith(2, expect.objectContaining({
    take: 100, orderBy: { id: "asc" }, where: { deletingAt: { not: null }, id: { gt: "099" } },
  }));
  expect(db.finalizeFile).toHaveBeenCalledTimes(101);
});
