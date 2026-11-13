import { beforeEach, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, HEAD } from "@/app/r/[slug]/route";

const { hooks } = vi.hoisted(() => ({ hooks: [] as Array<() => Promise<void>> }));
vi.mock("next/server", () => ({
  after: (callback: () => Promise<void>) => { hooks.push(callback); },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { page: { findUnique: vi.fn() }, pageSlugHistory: { findUnique: vi.fn() }, $transaction: vi.fn() },
}));
vi.mock("@/server/scans", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/scans")>();
  return { ...original, recordScan: vi.fn() };
});

beforeEach(() => { vi.clearAllMocks(); hooks.length = 0; });
const context = (slug: string) => ({ params: Promise.resolve({ slug }) });
function activePage(slug = "baru") {
  vi.mocked(prisma.page.findUnique).mockResolvedValue({ id: "page-1", slug, isPublished: true } as never);
  vi.mocked(prisma.pageSlugHistory.findUnique).mockResolvedValue(null);
}

it("mengalihkan slug aktif ke halaman publik dengan 307", async () => {
  activePage("aktif");
  const response = await GET(new Request("https://app.test/r/aktif", { headers: { "user-agent": "Mozilla Android" } }), context("aktif"));
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("/p/aktif");
  expect(hooks).toHaveLength(1);
});

it("mengalihkan slug riwayat ke slug terbaru dan tidak melog HEAD", async () => {
  vi.mocked(prisma.page.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.pageSlugHistory.findUnique).mockResolvedValue({ page: { id: "page-1", slug: "terbaru", isPublished: true } } as never);
  const response = await HEAD(new Request("https://app.test/r/lama", { method: "HEAD" }), context("lama"));
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("/p/terbaru");
  expect(hooks).toHaveLength(0);
});

it.each([
  ["draft", { id: "page-1", slug: "draft", isPublished: false }, null],
  ["unknown", null, null],
  ["history-draft", null, { page: { id: "page-1", slug: "draft-terbaru", isPublished: false } }],
] as const)("mengirim slug %s ke 404 ramah tanpa membuka status", async (_name, page, history) => {
  vi.mocked(prisma.page.findUnique).mockResolvedValue(page as never);
  vi.mocked(prisma.pageSlugHistory.findUnique).mockResolvedValue(history as never);
  const response = await GET(new Request("https://app.test/r/slug"), context("slug"));
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("/not-found");
  expect(hooks).toHaveLength(0);
});

it("kegagalan mencatat scan tidak menahan respons redirect", async () => {
  activePage("okay");
  const { recordScan } = await import("@/server/scans");
  vi.mocked(recordScan).mockRejectedValue(new Error("storage down"));
  const response = await GET(new Request("https://app.test/r/okay"), context("okay"));
  expect(response.status).toBe(307);
  expect(hooks).toHaveLength(1);
  await expect(hooks[0]()).resolves.toBeUndefined();
});


it.each([GET, HEAD])("mempertahankan domain publik di balik reverse proxy", async (handler) => {
  activePage("untuk-kamu");
  const response = await handler(new Request("http://0.0.0.0:3000/r/untuk-kamu"), context("untuk-kamu"));
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("/p/untuk-kamu");
  expect(new URL(response.headers.get("location")!, "https://flowfe.web.id/r/untuk-kamu").href)
    .toBe("https://flowfe.web.id/p/untuk-kamu");
});

it("slug tidak valid tetap mengarah ke domain publik", async () => {
  const response = await GET(new Request("http://0.0.0.0:3000/r/invalid"), context("invalid/slug"));
  expect(response.headers.get("location")).toBe("/not-found");
  expect(hooks).toHaveLength(0);
});
