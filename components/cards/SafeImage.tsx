import Image from "next/image";
import { safeWebUrl } from "@/lib/card-links";

export function safeImageSource(src: string): boolean {
  return /^\/uploads\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(src) || safeWebUrl(src) !== null;
}

// Remote URLs are fetched by the visitor, never by an unrestricted optimization
// proxy. Local uploads use Next's resizing/format negotiation and srcset.
export function SafeImage({ src, alt, sizes, priority = false, className = "" }: {
  src: string; alt: string; sizes: string; priority?: boolean; className?: string;
}) {
  if (!safeImageSource(src)) return null;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority}
    loading={priority ? undefined : "lazy"} unoptimized={!src.startsWith("/uploads/")} className={className} />;
}
