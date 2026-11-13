import { beforeEach, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { addDateKeyDays, csvCell, fillDailyCounts, formatJakartaIso, getPageStats, jakartaDateKey, jakartaStartUtc, resolveStatsRange } from "@/server/stats";

vi.mock("@/lib/prisma", () => ({ prisma: { page: { findUnique: vi.fn() }, $queryRaw: vi.fn() } }));
const pageId = "c123456789012345678901234";
const ownedPage = { id: pageId, ownerId: "editor-1", title: "Tes Statistik", slug: "tes-statistik" };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.page.findUnique).mockResolvedValue(ownedPage as never);
  vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
});

it("mengelompokkan tanggal berdasarkan hari Jakarta di batas tengah malam", () => {
  expect(jakartaDateKey(new Date("2026-11-13T16:59:59.999Z"))).toBe("2026-11-13");
  expect(jakartaDateKey(new Date("2026-11-13T17:00:00.000Z"))).toBe("2026-11-14");
  expect(jakartaStartUtc("2026-11-14").toISOString()).toBe("2026-11-13T17:00:00.000Z");
});

it("mengisi hari tanpa scan dengan nilai nol", () => {
  const daily = fillDailyCounts("2026-11-12", "2026-11-15", [{ day: "2026-11-12", count: BigInt(4) }, { day: "2026-11-15", count: BigInt(2) }]);
  expect(daily).toEqual([
    { date: "2026-11-12", scans: 4 }, { date: "2026-11-13", scans: 0 },
    { date: "2026-11-14", scans: 0 }, { date: "2026-11-15", scans: 2 },
  ]);
  expect(addDateKeyDays("2026-11-30", 1)).toBe("2026-12-01");
});

it("membatasi editor ke halaman miliknya sebelum menjalankan agregasi", async () => {
  const editor = { id: "editor-1", role: "EDITOR" as const };
  await expect(getPageStats(editor, pageId, { range: "7d" }, new Date("2026-11-13T12:00:00Z"))).resolves.toMatchObject({ page: { id: pageId } });
  expect(prisma.$queryRaw).toHaveBeenCalledTimes(4);
  vi.mocked(prisma.page.findUnique).mockResolvedValue({ ...ownedPage, ownerId: "editor-2" } as never);
  await expect(getPageStats({ id: "editor-1", role: "EDITOR" }, pageId, { range: "7d" })).rejects.toMatchObject({ status: 403 });
  expect(prisma.$queryRaw).toHaveBeenCalledTimes(4);
});

it("membatasi rentang kustom 90 hari dan mengembalikan default saat invalid", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  expect(resolveStatsRange({ range: "custom", from: "2026-11-01", to: "2026-11-13" }, now)).toEqual({ preset: "custom", from: "2026-11-01", to: "2026-11-13" });
  expect(resolveStatsRange({ range: "custom", from: "2026-01-01", to: "2026-11-13" }, now)).toEqual({ preset: "30d", from: "2026-10-15", to: "2026-11-13" });
});

it.each(["=1+1", "+cmd|' /C calc'!A0", "-2+3", "@SUM(A1:A2)", "\tcmd", "\rvalue"])("menetralkan CSV injection pada awalan %s", (danger) => {
  expect(csvCell(danger)).toBe(`"'${danger.replaceAll('"', '""')}"`);
});

it("mengutip pemisah dan kutip dalam nilai CSV biasa", () => {
  expect(csvCell("https://example.test/a,b?x=\"q\"")).toBe('"https://example.test/a,b?x=""q"""');
});

it("menulis timestamp CSV dalam ISO dengan offset WIB", () => {
  expect(formatJakartaIso(new Date("2026-11-13T16:00:00.000Z"))).toBe("2026-11-13T23:00:00.000+07:00");
});
