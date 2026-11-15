import Image from "next/image";
import { safeWebUrl } from "@/lib/card-links";

export function safeImageSource(src: string): boolean {
  return /^\/uploads\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(src) || safeWebUrl(src) !== null;
}

// Local uploads and remote URLs are fetched directly by the visitor, without
// routing either through Next's image optimization proxy.
export function SafeImage({ src, alt, sizes, priority = false, className = "" }: {
  src: string; alt: string; sizes: string; priority?: boolean; className?: string;
}) {
  if (!safeImageSource(src)) return null;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority}
    loading={priority ? undefined : "lazy"} unoptimized className={className} />;
}
