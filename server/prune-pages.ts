import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { finalizeImageDeletion } from "./images";
import { isPageExpired } from "./page-access";
import { deletePageInTransaction } from "./page-deletion";
import { pageTransaction } from "./page-transactions";

const batchSize = 100;

export async function prunePages(cutoff = new Date()) {
  const counts = { pagesDeleted: 0, pagesFailed: 0, filesDeleted: 0, filesFailed: 0 };
  let afterPage: Prisma.PageWhereInput = {};
  for (;;) {
    const pages = await prisma.page.findMany({
      where: { expiresAt: { lte: cutoff }, ...afterPage },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
      select: { id: true, expiresAt: true }, take: batchSize,
    });
    for (const { id } of pages) {
      try {
        const deleted = await pageTransaction(async (tx) => {
          const page = await tx.page.findUnique({ where: { id }, select: { expiresAt: true } });
          if (!page || !isPageExpired(page.expiresAt, cutoff)) return false;
          await deletePageInTransaction(tx, id);
          return true;
        });
        if (deleted) counts.pagesDeleted++;
      } catch (error) {
        counts.pagesFailed++;
        console.error(`Gagal menghapus halaman ${id}.`, error);
      }
    }
    if (pages.length < batchSize) break;
    // No Prisma cursor: the last row may already have been deleted by this run.
    const { expiresAt, id } = pages[pages.length - 1];
    afterPage = { OR: [{ expiresAt: { gt: expiresAt! } }, { expiresAt, id: { gt: id } }] };
  }

  // Includes previous failures and markers just committed above. Each ID gets
  // one attempt in this pass, even if unlink keeps failing.
  let afterFile: Prisma.UploadedImageWhereInput = {};
  for (;;) {
    const files = await prisma.uploadedImage.findMany({
      where: { deletingAt: { not: null }, ...afterFile },
      orderBy: { id: "asc" }, select: { id: true, key: true, deletingAt: true }, take: batchSize,
    });
    for (const { id, key, deletingAt } of files) {
      try {
        if (await finalizeImageDeletion({ id, key, deletingAt: deletingAt! })) counts.filesDeleted++;
      } catch (error) {
        counts.filesFailed++;
        console.error(`Gagal menghapus file ${id}.`, error);
      }
    }
    if (files.length < batchSize) break;
    afterFile = { id: { gt: files[files.length - 1].id } };
  }
  return counts;
}
