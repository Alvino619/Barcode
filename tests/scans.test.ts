import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createIpHash, deriveDeviceType, isBotUserAgent, isPrefetchOrHead, recordScan, SCAN_DEDUPE_WINDOW_MS } from "@/server/scans";

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));
const tx = {
  $queryRaw: vi.fn(),
  scanLog: { findFirst: vi.fn(), create: vi.fn() },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("IP_HASH_SECRET", "test-ip-hash-secret-at-least-32-characters");
  vi.mocked(prisma.$transaction).mockImplementation(async (work) => work(tx as never) as never);
  tx.scanLog.findFirst.mockResolvedValue(null);
  tx.scanLog.create.mockResolvedValue({ id: "scan-1" });
});
afterEach(() => vi.unstubAllEnvs());

it("mengabaikan bot, prefetch, dan HEAD", () => {
  expect(isBotUserAgent("Googlebot/2.1")).toBe(true);
  expect(isBotUserAgent("Mozilla/5.0 (iPhone) Mobile Safari")).toBe(false);
  expect(isPrefetchOrHead("GET", new Headers({ Purpose: "prefetch" }))).toBe(true);
  expect(isPrefetchOrHead("GET", new Headers({ "Sec-Purpose": "prefetch;prerender" }))).toBe(true);
  expect(isPrefetchOrHead("HEAD", new Headers())).toBe(true);
  expect(isPrefetchOrHead("GET", new Headers())).toBe(false);
});

it("menurunkan tipe perangkat dari user agent", () => {
  expect(deriveDeviceType("Mozilla Android 14")).toBe("android");
  expect(deriveDeviceType("Mozilla iPhone OS 17 Mobile")).toBe("ios");
  expect(deriveDeviceType("Mozilla Windows NT 10.0")).toBe("desktop");
  expect(deriveDeviceType("curl/8.0")).toBe("other");
});

it("menghasilkan HMAC konsisten dan tidak menerima input tanpa secret/IP valid", () => {
  const first = createIpHash("203.0.113.4", "a-secret-with-at-least-32-characters");
  expect(first).toMatch(/^[a-f0-9]{64}$/);
  expect(createIpHash("203.0.113.4", "a-secret-with-at-least-32-characters")).toBe(first);
  expect(createIpHash("203.0.113.4", "different-secret-with-at-least-32-chars")).not.toBe(first);
  expect(createIpHash("invalid", "a-secret-with-at-least-32-characters")).toBeNull();
  expect(createIpHash("203.0.113.4", "short")).toBeNull();
});

it("mencatat metadata dan deduplikasi memakai jendela 30 detik", async () => {
  const now = new Date("2026-11-13T00:00:00.000Z");
  const req = new Request("https://contoh.test/r/slug", { headers: {
    "user-agent": "Mozilla/5.0 (Linux; Android 14)", "x-forwarded-for": "203.0.113.4, 10.0.0.1",
    referer: "https://search.example/",
  } });
  await recordScan("page-1", req, now);
  expect(tx.scanLog.findFirst).toHaveBeenCalledWith({ where: {
    pageId: "page-1", ipHash: expect.any(String), scannedAt: { gte: new Date(now.getTime() - SCAN_DEDUPE_WINDOW_MS) },
  }, select: { id: true } });
  expect(tx.scanLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
    pageId: "page-1", deviceType: "android", referrer: "https://search.example/", scannedAt: now,
    ipHash: createIpHash("203.0.113.4", process.env.IP_HASH_SECRET),
  }) });
  tx.scanLog.findFirst.mockResolvedValueOnce({ id: "recent" });
  await recordScan("page-1", req, new Date(now.getTime() + 1000));
  expect(tx.scanLog.create).toHaveBeenCalledTimes(1);
});

it("tetap dapat mencatat scan saat IP tidak tersedia tanpa menyimpan IP mentah", async () => {
  const req = new Request("https://contoh.test/r/slug", { headers: { "user-agent": "Custom reader" } });
  await recordScan("page-1", req);
  expect(tx.scanLog.findFirst).not.toHaveBeenCalled();
  expect(tx.scanLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ipHash: null, deviceType: "other" }) });
  expect(JSON.stringify(tx.scanLog.create.mock.calls)).not.toContain("203.0.113");
});
