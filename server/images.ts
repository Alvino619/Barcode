import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { uploadUrlSchema } from "@/lib/schemas/page";
import { AppError } from "./errors";
import type { ManagingUser } from "./page-access";
import { pageTransaction } from "./page-transactions";

export function collectImageUrls(value: unknown): string[] {
  if (typeof value === "string") return value.startsWith("/uploads/") ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(collectImageUrls);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectImageUrls);
  return [];
}

export async function assertImageAccess(tx: Prisma.TransactionClient, user: ManagingUser, urls: (string | null)[]) {
  for (const url of new Set(urls.filter((value): value is string => value !== null))) {
    if (!uploadUrlSchema.safeParse(url).success) throw new AppError(400, "URL unggahan tidak valid. Unggah ulang file melalui aplikasi.");
    const image = await tx.uploadedImage.findUnique({ where: { url } });
    if (!image || image.deletingAt) throw new AppError(400, "Gambar tidak tersedia. Unggah ulang gambar Anda.");
    if (image.ownerId === user.id || user.role === "ADMIN") continue;
    const sharedPage = await tx.page.findFirst({ where: { ownerId: user.id, OR: [{ logo: url }, { coverImage: url }] } });
    const ownedCards = await tx.$queryRaw<{ found: boolean }[]>`SELECT EXISTS (
      SELECT 1 FROM "Card" c JOIN "Page" p ON p.id = c."pageId"
      WHERE p."ownerId" = ${user.id} AND (position(${url} in c.content::text) > 0 OR position(${url} in c.style::text) > 0)
    ) AS found`;
    if (!sharedPage && !ownedCards[0]?.found) throw new AppError(403, "File ini bukan unggahan Anda.");
  }
}

export async function imageIsReferenced(tx: Prisma.TransactionClient, url: string) {
  // Conservative reference check includes future card assets and theme JSON.
  // False positives retain files rather than deleting something still in use.
  const rows = await tx.$queryRaw<{ used: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM "Page" WHERE "logo" = ${url} OR "coverImage" = ${url}
        OR position(${url} in "theme"::text) > 0
      UNION ALL
      SELECT 1 FROM "Card" WHERE position(${url} in "content"::text) > 0
        OR position(${url} in "style"::text) > 0
    ) AS used`;
  return rows[0]?.used ?? true;
}

type ImageDeletion = { id: string; key: string; deletingAt: Date };

// Caller holds the page write lock. Once marked, a file cannot be attached again.
export async function claimImageDeletion(tx: Prisma.TransactionClient, image: {
  id: string; key: string; url: string; deletingAt: Date | null;
}): Promise<ImageDeletion | null> {
  const { id, key } = image;
  if (image.deletingAt) return { id, key, deletingAt: image.deletingAt };
  if (await imageIsReferenced(tx, image.url)) return null;
  const deletingAt = new Date();
  await tx.uploadedImage.update({ where: { id }, data: { deletingAt } });
  return { id, key, deletingAt };
}

// Only committed claims may reach storage. Concurrent retries can both unlink
// (ENOENT is success), but only one can finish the registry entry.
export async function finalizeImageDeletion({ id, key, deletingAt }: ImageDeletion) {
  await getStorage().delete(key);
  return (await prisma.uploadedImage.deleteMany({ where: { id, deletingAt } })).count !== 0;
}

export async function cleanupImages(urls: string[]) {
  for (const url of new Set(urls)) {
    try {
      const marker = await pageTransaction(async (tx) => {
        const image = await tx.uploadedImage.findUnique({ where: { url } });
        return image && claimImageDeletion(tx, image);
      });
      if (marker) await finalizeImageDeletion(marker);
    } catch (error) { console.error("Pembersihan gambar tertunda", error); }
  }
}
