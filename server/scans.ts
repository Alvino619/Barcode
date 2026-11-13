import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";

export const SCAN_DEDUPE_WINDOW_MS = 30_000;
const botPattern = /bot|crawler|spider|slurp|preview|facebookexternalhit|telegrambot|discordbot|twitterbot|headless|lighthouse/i;

export function isBotUserAgent(userAgent: string | null | undefined) {
  return Boolean(userAgent && botPattern.test(userAgent));
}

export function isPrefetchOrHead(method: string, headers: Pick<Headers, "get">) {
  if (method.toUpperCase() === "HEAD") return true;
  return [headers.get("sec-purpose"), headers.get("purpose")]
    .some((value) => value?.toLowerCase().split(/[;,\s]/).includes("prefetch"));
}

export function deriveDeviceType(userAgent: string | null | undefined): "android" | "ios" | "desktop" | "other" {
  if (!userAgent) return "other";
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent))) return "ios";
  if (/windows|macintosh|x11|linux/i.test(userAgent)) return "desktop";
  return "other";
}

export function createIpHash(ip: string | null, secret = process.env.IP_HASH_SECRET): string | null {
  if (!ip || !secret || secret.length < 32 || isIP(ip) === 0) return null;
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function requestIp(headers: Pick<Headers, "get">): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || headers.get("x-real-ip")?.trim() || null;
  return candidate && isIP(candidate) ? candidate : null;
}

export function sanitizeReferrer(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch { return null; }
}

export async function resolvePublishedSlug(slug: string): Promise<{ pageId: string; latestSlug: string } | null> {
  const page = await prisma.page.findUnique({ where: { slug }, select: { id: true, slug: true, isPublished: true } });
  if (page) return page.isPublished ? { pageId: page.id, latestSlug: page.slug } : null;
  const history = await prisma.pageSlugHistory.findUnique({ where: { slug }, select: { page: { select: { id: true, slug: true, isPublished: true } } } });
  return history?.page.isPublished ? { pageId: history.page.id, latestSlug: history.page.slug } : null;
}

export async function recordScan(pageId: string, request: Request, now = new Date()) {
  const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;
  if (isPrefetchOrHead(request.method, request.headers) || isBotUserAgent(userAgent)) return false;
  const ipHash = createIpHash(requestIp(request.headers));
  const referrer = sanitizeReferrer(request.headers.get("referer"));
  const deviceType = deriveDeviceType(userAgent);
  const cutoff = new Date(now.getTime() - SCAN_DEDUPE_WINDOW_MS);

  await prisma.$transaction(async (tx) => {
    if (ipHash) {
      // Serialize same-page/same-IP requests so simultaneous scans cannot bypass deduplication.
      await tx.$queryRaw`SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${pageId}), hashtext(${ipHash}))) AS scan_lock`;
      const recent = await tx.scanLog.findFirst({ where: { pageId, ipHash, scannedAt: { gte: cutoff } }, select: { id: true } });
      if (recent) return;
    }
    await tx.scanLog.create({ data: { pageId, userAgent, deviceType, referrer, ipHash, scannedAt: now } });
  });
  return true;
}
