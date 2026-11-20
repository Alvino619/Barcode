import type { Metadata } from "next";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { PagePreview } from "@/components/cards/PagePreview";
import { resolvePublicPage } from "@/server/public-page";
import { publicMetadata } from "@/lib/public-metadata";

export const dynamic = "force-dynamic";
const getPublicPage = cache(resolvePublicPage);
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getPublicPage((await params).slug);
  if (result.kind === "redirect") redirect(`/p/${result.slug}`);
  if (result.kind === "not-found") return { title: "Halaman tidak ditemukan", robots: { index: false, follow: false } };
  return publicMetadata(result.document);
}
export default async function PublicPage({ params }: Props) {
  const result = await getPublicPage((await params).slug);
  if (result.kind === "redirect") redirect(`/p/${result.slug}`);
  if (result.kind === "not-found") notFound();
  return <main id="konten-halaman"><PagePreview document={result.document} fullPage /></main>;
}
