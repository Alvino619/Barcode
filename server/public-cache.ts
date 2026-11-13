import { cache } from "react";
import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugSchema } from "@/lib/schemas/page";
import { resolvePublicPage } from "./public-page";

export const publicSlugTag = (slug: string) => `public-slug:${slug}`;
export const getPublicPage = cache(async (slug: string) => {
  if (!slugSchema.safeParse(slug).success) return { kind: "not-found" } as const;
  return unstable_cache(() => resolvePublicPage(slug), ["public-page-v4", slug], { tags: [publicSlugTag(slug)], revalidate: 60 })();
});

// Call after commit, including create (to invalidate cached 404s). Deleted pages
// pass the aliases collected before cascade removes their history.
export async function invalidatePublicPage(pageId: string | null, extraSlugs: string[] = []) {
  const page = pageId ? await prisma.page.findUnique({ where: { id: pageId }, select: { slug: true, slugHistory: { select: { slug: true } } } }) : null;
  const slugs = new Set([...extraSlugs, ...(page ? [page.slug, ...page.slugHistory.map((item) => item.slug)] : [])]);
  for (const slug of slugs) {
    revalidateTag(publicSlugTag(slug));
    revalidatePath(`/p/${slug}`);
  }
}
