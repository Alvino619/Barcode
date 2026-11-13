import { notFound } from "next/navigation";
import { PageEditor } from "@/components/page-editor";
import { requireUser } from "@/server/auth";
import { assertCanManagePage } from "@/server/page-access";
import { AppError } from "@/server/errors";
import { pageIdSchema } from "@/lib/schemas/page";
import { prisma } from "@/lib/prisma";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const parsed = pageIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  let page;
  try { page = await assertCanManagePage(user, parsed.data); }
  catch (error) { if (error instanceof AppError) notFound(); throw error; }
  if (!page) notFound();
  const cardCount = await prisma.card.count({ where: { pageId: page.id } });
  return <PageEditor page={{ id: page.id, title: page.title, slug: page.slug, description: page.description ?? "", logo: page.logo, coverImage: page.coverImage, isPublished: page.isPublished, cardCount }} />;
}
