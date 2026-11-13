import type { Card, Page } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cardSchema } from "@/lib/schemas/card";
import { imageUrlSchema, pageThemeSchema, slugSchema } from "@/lib/schemas/page";
import type { BuilderDocument } from "@/lib/schemas/builder";

type StoredCard = Pick<Card, "id" | "type" | "order" | "isVisible" | "content" | "style">;
type StoredPage = Pick<Page, "id" | "title" | "slug" | "description" | "logo" | "coverImage" | "theme" | "isPublished">;
export type PublicResolution = { kind: "page"; document: BuilderDocument } | { kind: "redirect"; slug: string } | { kind: "not-found" };

export function parsePageDocument(page: StoredPage, cards: StoredCard[], includeHidden = false): BuilderDocument {
  const parsedTheme = pageThemeSchema.safeParse(page.theme);
  if (!parsedTheme.success) console.warn("Tema publik tidak valid; memakai default", { pageId: page.id });
  return {
    page: { title: page.title, slug: page.slug, description: page.description ?? "", isPublished: page.isPublished,
      logo: imageUrlSchema.safeParse(page.logo).success ? page.logo : null,
      coverImage: imageUrlSchema.safeParse(page.coverImage).success ? page.coverImage : null },
    theme: parsedTheme.success ? parsedTheme.data : pageThemeSchema.parse({}),
    cards: cards.filter((card) => includeHidden || card.isVisible).flatMap((card) => {
      const parsed = cardSchema.safeParse({ type: card.type, order: card.order, isVisible: card.isVisible, content: card.content, style: card.style });
      if (!parsed.success) {
        // Log identifiers/paths only, never the card's user-provided content.
        console.warn("Kartu publik tidak valid; dilewati", { pageId: page.id, cardId: card.id, fields: parsed.error.issues.map((issue) => issue.path.join(".")) });
        return [];
      }
      return [{ id: card.id, data: parsed.data }];
    }),
  };
}

export async function resolvePublicPage(slug: string): Promise<PublicResolution> {
  if (!slugSchema.safeParse(slug).success) return { kind: "not-found" };
  const page = await prisma.page.findUnique({ where: { slug }, select: {
    id: true, title: true, slug: true, description: true, logo: true, coverImage: true, theme: true, isPublished: true,
    cards: { where: { isVisible: true }, orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true, type: true, order: true, isVisible: true, content: true, style: true } },
  } });
  if (page) return page.isPublished ? { kind: "page", document: parsePageDocument(page, page.cards) } : { kind: "not-found" };
  const history = await prisma.pageSlugHistory.findUnique({ where: { slug }, select: { page: { select: { slug: true, isPublished: true } } } });
  return history?.page.isPublished ? { kind: "redirect", slug: history.page.slug } : { kind: "not-found" };
}
