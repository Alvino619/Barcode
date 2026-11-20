import type { Prisma } from "@prisma/client";
import { claimImageDeletion, collectImageUrls } from "./images";

// Manual deletion and expiry both call this after authorizing/rechecking under
// pageTransaction's lock. Returned claims are safe to unlink only after commit.
export async function deletePageInTransaction(tx: Prisma.TransactionClient, pageId: string) {
  const page = await tx.page.findUniqueOrThrow({
    where: { id: pageId },
    select: { logo: true, coverImage: true, theme: true, cards: { select: { content: true, style: true } } },
  });
  const urls = [...new Set(collectImageUrls(page))];
  const images = await tx.uploadedImage.findMany({
    where: { OR: [{ sourcePageId: pageId }, { url: { in: urls } }] },
    select: { id: true, key: true, url: true, deletingAt: true },
  });
  await tx.page.delete({ where: { id: pageId } });
  const markers = [];
  for (const image of images) {
    const marker = await claimImageDeletion(tx, image);
    if (marker) markers.push(marker);
  }
  return markers;
}
