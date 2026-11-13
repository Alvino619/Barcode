import { invalidatePublicPage } from "./public-cache";
import { Prisma } from "@prisma/client";
import { cardSchema } from "@/lib/schemas/card";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { deletePageSchema, pageInputSchema, pageQuerySchema, pageThemeSchema, slugSchema } from "@/lib/schemas/page";
import { assertCanManagePage, type ManagingUser } from "./page-access";
import { AppError } from "./errors";
import { pageTransaction } from "./page-transactions";
import { assertImageAccess, cleanupImages, collectImageUrls } from "./images";

export const PAGE_SIZE = 10;
export async function listPages(user: ManagingUser, input: unknown) {
  const query = pageQuerySchema.parse(input);
  const where: Prisma.PageWhereInput = {
    ...(user.role === "ADMIN" ? {} : { ownerId: user.id }),
    ...(query.status === "all" ? {} : { isPublished: query.status === "published" }),
    ...(query.q ? { OR: [{ title: { contains: query.q, mode: "insensitive" } }, { slug: { contains: query.q, mode: "insensitive" } }] } : {}),
  };
  return prisma.$transaction(async (tx) => {
    const total = await tx.page.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(query.page, totalPages);
    const pages = await tx.page.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: (currentPage - 1) * PAGE_SIZE, take: PAGE_SIZE,
      select: { id: true, title: true, slug: true, logo: true, isPublished: true, updatedAt: true, _count: { select: { scanLogs: true } } } });
    return { pages, total, currentPage, totalPages, query };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function isSlugAvailable(slug: string, pageId?: string, tx: Pick<Prisma.TransactionClient, "page" | "pageSlugHistory"> = prisma) {
  slugSchema.parse(slug);
  const [current, history] = await Promise.all([
    tx.page.findUnique({ where: { slug }, select: { id: true } }),
    tx.pageSlugHistory.findUnique({ where: { slug }, select: { pageId: true } }),
  ]);
  return (!current || current.id === pageId) && (!history || history.pageId === pageId);
}

export async function createPage(user: ManagingUser, input: unknown) {
  const data = pageInputSchema.parse(input);
  const page = await pageTransaction(async (tx) => {
    await assertCanManagePage(user, null, tx);
    if (!await isSlugAvailable(data.slug, undefined, tx)) throw new AppError(409, "Slug sudah digunakan atau tersimpan dalam riwayat halaman lain.");
    await assertImageAccess(tx, user, [data.logo, data.coverImage]);
    return tx.page.create({ data: { ...data, ownerId: user.id, theme: pageThemeSchema.parse({}) } });
  });
  await invalidatePublicPage(page.id);
  return page;
}

export async function updatePage(user: ManagingUser, pageId: string, input: unknown) {
  const data = pageInputSchema.parse(input);
  const result = await pageTransaction(async (tx) => {
    const old = await assertCanManagePage(user, pageId, tx);
    if (!old) throw new AppError(404, "Halaman tidak ditemukan.");
    if (!await isSlugAvailable(data.slug, pageId, tx)) throw new AppError(409, "Slug sudah digunakan atau tersimpan dalam riwayat halaman lain.");
    await assertImageAccess(tx, user, [data.logo, data.coverImage]);
    if (old.slug !== data.slug) {
      // Returning to one of this page's old slugs is allowed. Remove that alias,
      // then record the former current slug in the same transaction.
      await tx.pageSlugHistory.deleteMany({ where: { pageId, slug: data.slug } });
      await tx.pageSlugHistory.upsert({ where: { slug: old.slug }, update: {}, create: { pageId, slug: old.slug } });
    }
    const page = await tx.page.update({ where: { id: pageId }, data: { ...data, updatedAt: new Date(Math.max(Date.now(), old.updatedAt.getTime() + 1)) } });
    return { page, oldUrls: collectImageUrls([old.logo, old.coverImage]) };
  });
  await invalidatePublicPage(result.page.id);
  await cleanupImages(result.oldUrls);
  return result.page;
}

export async function duplicatePage(user: ManagingUser, pageId: string) {
  const copy = await pageTransaction(async (tx) => {
    const original = await assertCanManagePage(user, pageId, tx);
    if (!original) throw new AppError(404, "Halaman tidak ditemukan.");
    const cards = await tx.card.findMany({ where: { pageId }, orderBy: [{ order: "asc" }, { id: "asc" }] });
    const base = generateSlug(`${original.title} salinan`).slice(0, 48).replace(/-+$/, "");
    let slug = base;
    for (let suffix = 2; !await isSlugAvailable(slug, undefined, tx); suffix++) slug = `${base}-${suffix}`;
    // Copies share image URLs. Blindly deleting an original file would break its
    // copies; cleanupImages checks references across ALL pages and cards first.
    return tx.page.create({ data: {
      title: `${original.title} (salinan)`, slug, ownerId: user.id, isPublished: false,
      description: original.description, logo: original.logo, coverImage: original.coverImage,
      theme: original.theme === null ? Prisma.JsonNull : original.theme,
      cards: { create: cards.map((card) => cardSchema.parse({ type: card.type, order: card.order, isVisible: card.isVisible,
        content: card.content, style: card.style })) },
    } });
  });
  await invalidatePublicPage(copy.id);
  return copy;
}

export async function deletePage(user: ManagingUser, pageId: string, input: unknown) {
  const data = deletePageSchema.parse(input);
  const result = await pageTransaction(async (tx) => {
    const page = await assertCanManagePage(user, pageId, tx);
    if (!page) throw new AppError(404, "Halaman tidak ditemukan.");
    if (data.title !== page.title) throw new AppError(400, "Judul konfirmasi harus sama persis dengan judul halaman.");
    const cards = await tx.card.findMany({ where: { pageId }, select: { content: true, style: true } });
    const urls = collectImageUrls([page.logo, page.coverImage, page.theme, cards]);
    const history = await tx.pageSlugHistory.findMany({ where: { pageId }, select: { slug: true } });
    await tx.page.delete({ where: { id: pageId } });
    return { urls, slugs: [page.slug, ...history.map((item) => item.slug)] };
  });
  await invalidatePublicPage(null, result.slugs);
  await cleanupImages(result.urls);
}
