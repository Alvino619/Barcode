import { cardSchema } from "@/lib/schemas/card";
import { pageThemeSchema } from "@/lib/schemas/page";
import { saveBuilderSchema, versionMatches, type BuilderState } from "@/lib/schemas/builder";
import { assertCanManagePage, type ManagingUser } from "./page-access";
import { pageTransaction } from "./page-transactions";
import { AppError } from "./errors";
import { assertImageAccess, cleanupImages, collectImageUrls } from "./images";
import { isSlugAvailable } from "./pages";

export class VersionConflict extends AppError {
  constructor(public updatedAt: string) { super(409, "Halaman diubah di tempat lain."); }
}

export function loadBuilder(user: ManagingUser, pageId: string): Promise<BuilderState> {
  return pageTransaction(async (tx) => {
    const page = await assertCanManagePage(user, pageId, tx);
    if (!page) throw new AppError(404, "Halaman tidak ditemukan.");
    const cards = await tx.card.findMany({ where: { pageId }, orderBy: [{ order: "asc" }, { id: "asc" }] });
    return { updatedAt: page.updatedAt.toISOString(), document: {
      page: { title: page.title, slug: page.slug, description: page.description ?? "", logo: page.logo, coverImage: page.coverImage, isPublished: page.isPublished },
      theme: pageThemeSchema.parse(page.theme),
      cards: cards.map((card, order) => ({ id: card.id, data: cardSchema.parse({ type: card.type, order, isVisible: card.isVisible, content: card.content, style: card.style }) })),
    } };
  });
}

export async function saveBuilder(user: ManagingUser, pageId: string, input: unknown) {
  const payload = saveBuilderSchema.parse(input);
  const { document } = payload;
  const result = await pageTransaction(async (tx) => {
    const page = await assertCanManagePage(user, pageId, tx);
    if (!page) throw new AppError(404, "Halaman tidak ditemukan.");
    if (!versionMatches(page.updatedAt, payload.updatedAt)) throw new VersionConflict(page.updatedAt.toISOString());
    if (!await isSlugAvailable(document.page.slug, pageId, tx)) throw new AppError(409, "Slug telah digunakan halaman lain.");
    const ids = document.cards.map((card) => card.id);
    if (await tx.card.count({ where: { id: { in: ids }, pageId: { not: pageId } } })) throw new AppError(403, "Kartu berasal dari halaman lain.");
    await assertImageAccess(tx, user, collectImageUrls(document));
    const oldCards = await tx.card.findMany({ where: { pageId }, select: { content: true, style: true } });
    const oldUrls = collectImageUrls([oldCards, page.logo, page.coverImage, page.theme]);
    if (page.slug !== document.page.slug) {
      await tx.pageSlugHistory.deleteMany({ where: { pageId, slug: document.page.slug } });
      await tx.pageSlugHistory.create({ data: { pageId, slug: page.slug } });
    }
    await tx.card.deleteMany({ where: { pageId, id: { notIn: ids } } });
    // (pageId, order) is a non-unique index. All reordering is atomic in this
    // transaction; no temporary offsets are necessary for the current schema.
    for (const [order, card] of document.cards.entries()) {
      const data = cardSchema.parse({ ...card.data, order });
      await tx.card.upsert({ where: { id: card.id }, create: { id: card.id, pageId, ...data }, update: data });
    }
    const updatedAt = new Date(Math.max(Date.now(), page.updatedAt.getTime() + 1));
    await tx.page.update({ where: { id: pageId }, data: { ...document.page, theme: document.theme, updatedAt } });
    return { updatedAt: updatedAt.toISOString(), oldUrls };
  });
  await cleanupImages(result.oldUrls);
  return { updatedAt: result.updatedAt };
}
