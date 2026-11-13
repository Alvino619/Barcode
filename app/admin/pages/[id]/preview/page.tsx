import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { assertCanManagePage } from "@/server/page-access";
import { AppError } from "@/server/errors";
import { pageIdSchema } from "@/lib/schemas/page";
import { prisma } from "@/lib/prisma";
import { parsePageDocument } from "@/server/public-page";
import { PagePreview } from "@/components/cards/PagePreview";

export const metadata: Metadata = { title: "Pratinjau pengelola", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminPreview({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = pageIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  let page;
  try { page = await assertCanManagePage(user, id.data); }
  catch (error) { if (error instanceof AppError) notFound(); throw error; }
  if (!page) notFound();
  const cards = await prisma.card.findMany({ where: { pageId: page.id }, orderBy: [{ order: "asc" }, { id: "asc" }] });
  const document = parsePageDocument(page, cards, true);
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"><div><p className="font-semibold">Pratinjau pengelola · {page.isPublished ? "Dipublikasikan" : "Draft"}</p><p className="text-sm text-muted-foreground">Menampilkan versi tersimpan. Kartu tersembunyi diberi tanda dan tidak tampil di halaman publik.</p></div><Link className="rounded-md px-2 py-3 text-primary underline focus-visible:outline focus-visible:outline-2" href={`/admin/pages/${page.id}/edit`}>Kembali ke editor</Link></div><PagePreview document={document} showHidden /></div>;
}
