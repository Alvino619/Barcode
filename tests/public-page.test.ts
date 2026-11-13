import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { parsePageDocument, resolvePublicPage } from "@/server/public-page";
import { pageThemeSchema } from "@/lib/schemas/page";
import { publicMetadata } from "@/lib/public-metadata";

vi.mock("@/lib/prisma", () => ({ prisma: { page: { findUnique: vi.fn() }, pageSlugHistory: { findUnique: vi.fn() } } }));
const card = { id: "card-1", pageId: "page-1", type: "TEXT" as const, order: 0, isVisible: true, content: { text: "Konten aman" }, style: {}, createdAt: new Date(), updatedAt: new Date() };
const page = { id: "page-1", ownerId: "owner-1", slug: "halaman-contoh", title: "Halaman Contoh", description: "Informasi contoh", isPublished: true, logo: null, coverImage: null, theme: {}, createdAt: new Date(), updatedAt: new Date(), cards: [card] };

describe("resolusi halaman publik", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(prisma.page.findUnique).mockResolvedValue(null); vi.mocked(prisma.pageSlugHistory.findUnique).mockResolvedValue(null); });
  it("slug aktif published memuat hanya kartu visible dengan urutan stabil", async () => {
    vi.mocked(prisma.page.findUnique).mockResolvedValue(page);
    const result = await resolvePublicPage(page.slug);
    expect(result.kind).toBe("page");
    expect(prisma.page.findUnique).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ cards: expect.objectContaining({ where: { isVisible: true }, orderBy: [{ order: "asc" }, { id: "asc" }] }) }) }));
    expect(prisma.pageSlugHistory.findUnique).not.toHaveBeenCalled();
  });
  it("alias mengarah langsung ke slug terbaru", async () => {
    const history = { id: "history-1", pageId: page.id, slug: "lama", createdAt: new Date(), page: { slug: "terbaru", isPublished: true } };
    vi.mocked(prisma.pageSlugHistory.findUnique).mockResolvedValue(history);
    expect(await resolvePublicPage("lama")).toEqual({ kind: "redirect", slug: "terbaru" });
  });
  it("draft aktif, alias draft, slug hilang, dan slug invalid tidak membocorkan data", async () => {
    vi.mocked(prisma.page.findUnique).mockResolvedValue({ ...page, isPublished: false });
    expect(await resolvePublicPage(page.slug)).toEqual({ kind: "not-found" });
    vi.mocked(prisma.page.findUnique).mockResolvedValue(null);
    const history = { id: "h", pageId: page.id, slug: "lama", createdAt: new Date(), page: { slug: page.slug, isPublished: false } };
    vi.mocked(prisma.pageSlugHistory.findUnique).mockResolvedValue(history);
    expect(await resolvePublicPage("lama")).toEqual({ kind: "not-found" });
    vi.mocked(prisma.pageSlugHistory.findUnique).mockResolvedValue(null);
    expect(await resolvePublicPage("hilang")).toEqual({ kind: "not-found" });
    expect(await resolvePublicPage("../admin")).toEqual({ kind: "not-found" });
  });
  it("kartu rusak dilewati dan log hanya memuat identitas, bukan isi", () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = { ...card, id: "broken", content: { text: "", secret: "JANGAN LOG ISI" } };
    const hidden = { ...card, id: "hidden", isVisible: false };
    expect(parsePageDocument(page, [card, broken, hidden]).cards.map((item) => item.id)).toEqual([card.id]);
    expect(log).toHaveBeenCalledWith("Kartu publik tidak valid; dilewati", expect.objectContaining({ cardId: "broken" }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("JANGAN LOG ISI");
    expect(parsePageDocument(page, [card, hidden], true).cards.map((item) => item.id)).toEqual([card.id, "hidden"]);
    log.mockRestore();
  });
  it("tema rusak memakai default tanpa menjatuhkan halaman", () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = parsePageDocument({ ...page, theme: { font: "tidak-dikenal" } }, [card]);
    expect(result.theme).toEqual(pageThemeSchema.parse({})); expect(result.cards).toHaveLength(1); log.mockRestore();
  });
  it("metadata memakai canonical terbaru, OG sampul, Twitter, dan noindex", () => {
    vi.stubEnv("SITE_URL", "https://contoh.test");
    const document = parsePageDocument(page, [card]);
    document.page.slug = "slug-terbaru"; document.theme.noIndex = true;
    document.page.coverImage = "/uploads/00000000-0000-4000-8000-000000000000.png";
    const metadata = publicMetadata(document);
    expect(metadata.alternates?.canonical).toBe("https://contoh.test/p/slug-terbaru");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.openGraph).toMatchObject({ title: page.title, url: "https://contoh.test/p/slug-terbaru", images: [{ url: "https://contoh.test" + document.page.coverImage, alt: page.title }] });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    vi.unstubAllEnvs();
  });
});
