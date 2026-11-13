import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { customStatsRangeSchema, statsRangeSchema } from "@/lib/schemas/stats";
import type { ManagingUser } from "./page-access";
import { assertCanManagePage } from "./page-access";
import { AppError } from "./errors";

const ZONE = "Asia/Jakarta";
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const formatter = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

export type StatsRange = { preset: "7d" | "30d" | "90d" | "custom"; from: string; to: string };
export type DailyCount = { date: string; scans: number };
type CountRow = { day: string; count: bigint };

export function jakartaDateKey(date: Date) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDateKeyDays(key: string, delta: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function jakartaStartUtc(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - JAKARTA_OFFSET_MS);
}

export function fillDailyCounts(from: string, to: string, rows: CountRow[]): DailyCount[] {
  const counts = new Map(rows.map((row) => [row.day, Number(row.count)]));
  const result: DailyCount[] = [];
  for (let date = from; date <= to; date = addDateKeyDays(date, 1)) result.push({ date, scans: counts.get(date) ?? 0 });
  return result;
}

export function resolveStatsRange(input: unknown, now = new Date()): StatsRange {
  const today = jakartaDateKey(now);
  if (input && typeof input === "object" && "range" in input) {
    const value = input as { range?: unknown; from?: unknown; to?: unknown };
    const preset = statsRangeSchema.safeParse(value.range);
    if (preset.success && preset.data === "custom") {
      const custom = customStatsRangeSchema.safeParse({ from: value.from, to: value.to });
      if (custom.success && custom.data.from <= today && custom.data.to <= today) return { preset: "custom", ...custom.data };
      return { preset: "30d", from: addDateKeyDays(today, -29), to: today };
    }
    if (preset.success && preset.data !== "custom") {
      const days = Number(preset.data.slice(0, -1));
      return { preset: preset.data, from: addDateKeyDays(today, 1 - days), to: today };
    }
  }
  return { preset: "30d", from: addDateKeyDays(today, -29), to: today };
}

export function dateRangeBounds(range: StatsRange, now = new Date()) {
  const start = jakartaStartUtc(range.from);
  const nextDay = jakartaStartUtc(addDateKeyDays(range.to, 1));
  return { start, end: nextDay < now ? nextDay : now };
}

export function csvCell(value: string | null | undefined) {
  const safe = value ?? "";
  const guarded = /^[=+\-@\t\r]/.test(safe) ? `'${safe}` : safe;
  return `"${guarded.replaceAll('"', '""')}"`;
}

export function formatJakartaIso(date: Date) {
  return `${new Date(date.getTime() + JAKARTA_OFFSET_MS).toISOString().replace("Z", "+07:00")}`;
}

export async function getDashboardStats(user: ManagingUser, now = new Date()) {
  const today = jakartaDateKey(now);
  const weekStart = jakartaStartUtc(addDateKeyDays(today, -6));
  const monthStart = jakartaStartUtc(addDateKeyDays(today, -29));
  const ownerFilter = user.role === "ADMIN" ? Prisma.empty : Prisma.sql`WHERE p."ownerId" = ${user.id}`;
  const [summaryRows, popularRows] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint; last7: bigint; last30: bigint }>>`
      SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE s."scannedAt" >= ${weekStart} AND s."scannedAt" < ${now}) AS last7,
        COUNT(*) FILTER (WHERE s."scannedAt" >= ${monthStart} AND s."scannedAt" < ${now}) AS last30
      FROM "ScanLog" s JOIN "Page" p ON p."id" = s."pageId"
      WHERE (${user.role === "ADMIN"} OR p."ownerId" = ${user.id})`,
    prisma.$queryRaw<Array<{ id: string; title: string; slug: string; scans: bigint }>>`
      SELECT p."id", p."title", p."slug", COUNT(s."id") AS scans
      FROM "Page" p LEFT JOIN "ScanLog" s ON s."pageId" = p."id"
      ${ownerFilter}
      GROUP BY p."id", p."title", p."slug"
      ORDER BY scans DESC, p."title" ASC LIMIT 1`,
  ]);
  const summary = summaryRows[0] ?? { total: BigInt(0), last7: BigInt(0), last30: BigInt(0) };
  const popular = popularRows[0];
  return {
    total: Number(summary.total), last7: Number(summary.last7), last30: Number(summary.last30),
    popular: popular && Number(popular.scans) > 0 ? { ...popular, scans: Number(popular.scans) } : null,
  };
}

export async function getPageStats(user: ManagingUser, pageId: string, input: unknown, now = new Date()) {
  const page = await assertCanManagePage(user, pageId);
  if (!page) throw new AppError(404, "Halaman tidak ditemukan.");
  const range = resolveStatsRange(input, now);
  const { start, end } = dateRangeBounds(range, now);
  const [dailyRows, deviceRows, hourRows, referrerRows] = await Promise.all([
    prisma.$queryRaw<CountRow[]>`
      SELECT to_char(date_trunc('day', s."scannedAt" AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD') AS day, COUNT(*) AS count
      FROM "ScanLog" s WHERE s."pageId" = ${pageId} AND s."scannedAt" >= ${start} AND s."scannedAt" < ${end}
      GROUP BY day ORDER BY day`,
    prisma.$queryRaw<Array<{ device: string; count: bigint }>>`
      SELECT CASE lower(COALESCE("deviceType", 'other'))
        WHEN 'android' THEN 'android' WHEN 'ios' THEN 'ios' WHEN 'desktop' THEN 'desktop' ELSE 'other' END AS device,
        COUNT(*) AS count FROM "ScanLog"
      WHERE "pageId" = ${pageId} AND "scannedAt" >= ${start} AND "scannedAt" < ${end}
      GROUP BY device`,
    prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT EXTRACT(HOUR FROM "scannedAt" AT TIME ZONE 'Asia/Jakarta')::int AS hour, COUNT(*) AS count
      FROM "ScanLog" WHERE "pageId" = ${pageId} AND "scannedAt" >= ${start} AND "scannedAt" < ${end}
      GROUP BY hour ORDER BY hour`,
    prisma.$queryRaw<Array<{ referrer: string; count: bigint }>>`
      SELECT COALESCE(NULLIF("referrer", ''), '') AS referrer, COUNT(*) AS count
      FROM "ScanLog" WHERE "pageId" = ${pageId} AND "scannedAt" >= ${start} AND "scannedAt" < ${end}
      GROUP BY referrer ORDER BY count DESC LIMIT 10`,
  ]);

  const daily = fillDailyCounts(range.from, range.to, dailyRows);
  const devices = ["android", "ios", "desktop", "other"].map((device) => ({
    device, label: ({ android: "Android", ios: "iOS", desktop: "Desktop", other: "Lainnya" } as Record<string, string>)[device],
    scans: Number(deviceRows.find((row) => row.device === device)?.count ?? BigInt(0)),
  }));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${String(hour).padStart(2, "0")}.00`, scans: Number(hourRows.find((row) => row.hour === hour)?.count ?? BigInt(0)) }));
  return {
    page: { id: page.id, title: page.title, slug: page.slug }, range, total: daily.reduce((sum, row) => sum + row.scans, 0), daily, devices, hours,
    referrers: referrerRows.map((row) => ({ referrer: row.referrer || "Langsung / scan QR", scans: Number(row.count) })),
  };
}
