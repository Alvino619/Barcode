import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveBuilder, VersionConflict } from "@/server/builder";
import { cardSchema } from "@/lib/schemas/card";
import { pageThemeSchema } from "@/lib/schemas/page";

const mocks = vi.hoisted(() => ({
  page: { id: "cm123456789012345678901234", updatedAt: new Date("2026-11-12T00:00:00.000Z"), slug: "tes", logo: null, coverImage: null, theme: {} },
  tx: { card: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() }, page: { update: vi.fn() }, pageSlugHistory: { deleteMany: vi.fn(), create: vi.fn() } },
  canManage: vi.fn(),
}));
vi.mock("@/server/page-transactions", () => ({ pageTransaction: (work: (tx: typeof mocks.tx) => Promise<unknown>) => work(mocks.tx) }));
vi.mock("@/server/page-access", () => ({ assertCanManagePage: mocks.canManage }));
vi.mock("@/server/pages", () => ({ isSlugAvailable: vi.fn().mockResolvedValue(true) }));
vi.mock("@/server/public-cache", () => ({ invalidatePublicPage: vi.fn() }));
vi.mock("@/server/images", () => ({ assertImageAccess: vi.fn(), cleanupImages: vi.fn(), collectImageUrls: () => [] }));

describe("penyimpanan builder", () => {
  const user = { id: "admin", role: "ADMIN" as const };
  const payload = () => ({ updatedAt: "2026-11-12T00:00:00.000Z", document: { page: { title: "Tes", slug: "tes", description: "", logo: null, coverImage: null, isPublished: false }, theme: pageThemeSchema.parse({}), cards: [0, 1].map((i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, data: cardSchema.parse({ type: "TEXT", order: 99, content: { text: `Kartu ${i}` } }) })) } });
  beforeEach(() => {
    vi.clearAllMocks(); mocks.canManage.mockResolvedValue(mocks.page);
    mocks.tx.card.count.mockResolvedValue(0); mocks.tx.card.findMany.mockResolvedValue([]);
  });
  it("menolak versi lama sebelum semua penulisan", async () => {
    const data = payload(); data.updatedAt = "2026-11-11T00:00:00.000Z";
    await expect(saveBuilder(user, mocks.page.id, data)).rejects.toBeInstanceOf(VersionConflict);
    expect(mocks.tx.card.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.card.upsert).not.toHaveBeenCalled(); expect(mocks.tx.page.update).not.toHaveBeenCalled();
  });
  it("memvalidasi dan menyimpan urutan berdasarkan array dalam transaksi", async () => {
    const data = payload(); data.document.cards.reverse();
    const result = await saveBuilder(user, mocks.page.id, data);
    expect(mocks.canManage).toHaveBeenCalledWith(user, mocks.page.id, mocks.tx);
    expect(mocks.tx.card.upsert.mock.calls.map(([args]) => args.update.order)).toEqual([0, 1]);
    expect(mocks.tx.card.upsert.mock.calls[0][0].where.id).toBe(data.document.cards[0].id);
    expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(mocks.page.updatedAt.getTime());
  });
  it("menolak ID kartu dari halaman lain", async () => {
    mocks.tx.card.count.mockResolvedValue(1);
    await expect(saveBuilder(user, mocks.page.id, payload())).rejects.toMatchObject({ status: 403 });
    expect(mocks.tx.card.upsert).not.toHaveBeenCalled();
  });
  it("menolak input invalid dan ID ganda sebelum menyentuh database", async () => {
    const data = payload(); data.document.cards[1].id = data.document.cards[0].id;
    await expect(saveBuilder(user, mocks.page.id, data)).rejects.toThrow();
    expect(mocks.canManage).not.toHaveBeenCalled();
  });
});
