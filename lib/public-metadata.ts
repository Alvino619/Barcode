import type { Metadata } from "next";
import type { BuilderDocument } from "./schemas/builder";
import { safeWebUrl } from "./card-links";

export function siteOrigin() {
  const url = safeWebUrl(process.env.SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000");
  if (!url) throw new Error("SITE_URL/NEXTAUTH_URL harus berupa URL HTTP(S) valid.");
  return url.origin;
}
export function publicMetadata(document: BuilderDocument): Metadata {
  const { page, theme } = document;
  const canonical = `${siteOrigin()}/p/${page.slug}`;
  const description = page.description || `Informasi dan tautan dari ${page.title}.`;
  const image = page.coverImage ?? page.logo;
  const images = image ? [{ url: new URL(image, siteOrigin()).href, alt: page.title }] : [];
  return { title: page.title, description, alternates: { canonical },
    robots: { index: !theme.noIndex, follow: true },
    openGraph: { title: page.title, description, url: canonical, type: "website", locale: "id_ID", siteName: "QR Card Page", images },
    twitter: { card: image ? "summary_large_image" : "summary", title: page.title, description, images: images.map((item) => item.url) },
  };
}
