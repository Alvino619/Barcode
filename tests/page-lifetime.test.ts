import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPage, duplicatePage, updatePage } from "@/server/pages";
import { builderDocumentSchema } from "@/lib/schemas/builder";

const tx = vi.hoisted(() => ({
  page: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  pageSlugHistory: { findUnique: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() },
  card: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/server/page-transactions", () => ({ pageTransaction: (work: (db: typeof tx) => Promise<unknown>) => work(tx) }));
vi.mock("@/server/images", () => ({ assertImageAccess: vi.fn(), collectImageUrls: () => [], cleanupImages: vi.fn() }));

const owner = { id: "editor", role: "EDITOR" as const };
const input = { title: "Tes", slug: "tes" };
const start = new Date("2026-11-20T23:59:59.987Z");
const deadline = new Date("2026-11-27T23:59:59.987Z");
const source = { ...input, id: "cm123456789012345678901234", ownerId: owner.id, updatedAt: start, theme: {}, expiresAt: deadline };

function existing(expiresAt: Date | null) {
  tx.page.findUnique.mockImplementation(({ where }) => where.id === source.id ? { ...source, expiresAt } : null);
}

describe("masa berlaku halaman", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers(); vi.setSystemTime(start);
    tx.page.create.mockImplementation(({ data }) => data);
    tx.page.update.mockImplementation(({ data }) => data);
    tx.card.findMany.mockResolvedValue([]);
  });
  afterEach(() => { vi.useRealTimers(); });

  it.each([false, true])("memberi tujuh hari penuh baik draft maupun terbit (isPublished=%s)", async (isPublished) => {
    for (const lifetime of [undefined, "temporary"]) {
      const result = await createPage(owner, { ...input, lifetime, isPublished });
      expect(result.expiresAt).toEqual(deadline);
      expect(result).not.toHaveProperty("lifetime");
    }
    expect((await createPage(owner, { ...input, lifetime: "permanent", isPublished })).expiresAt).toBeNull();
  });

  it("menolak tenggat klien pada create dan update serta mode pada autosave", async () => {
    const invalid = { ...input, expiresAt: deadline.toISOString() };
    await expect(createPage(owner, invalid)).rejects.toThrow();
    await expect(updatePage(owner, source.id, invalid)).rejects.toThrow();
    expect(builderDocumentSchema.safeParse({ page: { ...input, lifetime: "temporary" }, theme: {}, cards: [] }).success).toBe(false);
    expect(tx.page.create).not.toHaveBeenCalled();
    expect(tx.page.update).not.toHaveBeenCalled();
  });

  it("tidak memperpanjang tenggat saat publikasi, rename, atau pemilihan sementara berulang", async () => {
    existing(deadline);
    vi.setSystemTime(new Date("2026-11-23T12:00:00.000Z"));
    for (const lifetime of [undefined, "temporary"]) {
      const page = await updatePage(owner, source.id, { ...input, isPublished: true, slug: "slug-baru", lifetime });
      expect(page.expiresAt).toEqual(deadline);
      expect(page).not.toHaveProperty("lifetime");
    }
  });

  it("membatalkan tenggat dan memulai tujuh hari baru hanya jika beralih kembali", async () => {
    existing(deadline);
    const permanent = await updatePage(owner, source.id, { ...input, lifetime: "permanent" });
    expect(permanent.expiresAt).toBeNull();
    existing(permanent.expiresAt);
    vi.setSystemTime(new Date("2026-11-24T07:00:01.123Z"));
    expect((await updatePage(owner, source.id, input)).expiresAt).toBeNull();
    expect((await updatePage(owner, source.id, { ...input, lifetime: "temporary" })).expiresAt)
      .toEqual(new Date("2026-12-01T07:00:01.123Z"));
  });

  it("mengikuti mode sumber, bukan tanggal sumber, saat duplikasi", async () => {
    vi.setSystemTime(new Date("2026-11-25T00:00:00.000Z"));
    existing(deadline);
    expect((await duplicatePage(owner, source.id)).expiresAt).toEqual(new Date("2026-12-02T00:00:00.000Z"));
    existing(null);
    expect((await duplicatePage(owner, source.id)).expiresAt).toBeNull();
  });

  it("menolak perubahan editor lain dan tindakan pemilik tepat pada tenggat", async () => {
    existing(deadline);
    await expect(updatePage({ ...owner, id: "other" }, source.id, input)).rejects.toMatchObject({ status: 403 });
    vi.setSystemTime(deadline);
    await expect(updatePage(owner, source.id, { ...input, lifetime: "permanent" })).rejects.toMatchObject({ status: 404 });
    await expect(duplicatePage(owner, source.id)).rejects.toMatchObject({ status: 404 });
    expect(tx.page.update).not.toHaveBeenCalled();
    expect(tx.page.create).not.toHaveBeenCalled();
  });
});
