import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pageIdSchema } from "@/lib/schemas/page";
import { AppError } from "./errors";

export type ManagingUser = { id: string; role: Role };
type PageReader = Pick<Prisma.TransactionClient, "page">;

export function isPageExpired(expiresAt: Date | null, now = new Date()) {
  return expiresAt !== null && expiresAt.getTime() <= now.getTime();
}

// null denotes creation of a page or an unattached upload, never an existing page.
export async function assertCanManagePage(user: ManagingUser, pageId: string | null, db: PageReader = prisma) {
  if (user.role !== "ADMIN" && user.role !== "EDITOR") throw new AppError(403, "Akses pengelolaan ditolak.");
  if (pageId === null) return null;
  const id = pageIdSchema.parse(pageId);
  const page = await db.page.findUnique({ where: { id } });
  if (!page || isPageExpired(page.expiresAt)) throw new AppError(404, "Halaman tidak ditemukan.");
  if (user.role !== "ADMIN" && page.ownerId !== user.id) {
    throw new AppError(403, "Anda tidak berhak mengelola halaman ini.");
  }
  return page;
}
