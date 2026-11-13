import { cardSchema, assetUrlSchema } from "@/lib/schemas/card";
import { cardVariables } from "@/lib/page-presentation";
import { SafeImage } from "./SafeImage";
import { Download, ExternalLink, Heart, Mail, MapPin, Phone, Star } from "lucide-react";
import type { ValidatedCard } from "@/lib/schemas/card";
import type { PageTheme } from "@/lib/schemas/page";
import { normalizeWhatsApp, videoEmbedUrl, isGoogleMapsEmbed, safeLink } from "@/lib/card-links";


type Props<T extends ValidatedCard["type"]> = { card: Extract<ValidatedCard, { type: T }>; priority?: boolean };
const icons = { link: ExternalLink, download: Download, heart: Heart, mail: Mail, pin: MapPin, phone: Phone, star: Star };
export function CardIcon({ name }: { name?: string }) {
  const Icon = name && name in icons ? icons[name as keyof typeof icons] : null;
  return Icon ? <Icon aria-hidden="true" className="inline-block h-5 w-5 shrink-0 align-middle" /> : null;
}
const linkClass = "inline-flex max-w-full items-center justify-center gap-2 rounded-lg border border-current/20 px-4 py-3 font-medium underline-offset-4 hover:underline break-words public-link";

function TextCard({ card }: Props<"TEXT">) {
  return <div className="public-text">{card.content.title && <h2 className="mb-2 text-xl font-bold">{card.content.title}</h2>}<p className="whitespace-pre-wrap break-words">{card.content.text}</p></div>;
}
function ImageCard({ card, priority }: Props<"IMAGE">) {
  return <figure><div className="public-media"><SafeImage src={card.content.url} alt={card.content.alt} sizes="(max-width: 640px) calc(100vw - 64px), 960px" className="public-media-image" priority={priority} /></div>{card.content.caption && <figcaption className="mt-2 text-sm opacity-80">{card.content.caption}</figcaption>}</figure>;
}
function LinkCard({ card }: Props<"LINK_BUTTON">) {
  return safeLink(card.content.url) ? <a href={card.content.url} target={card.content.openInNewTab ? "_blank" : undefined} rel="noopener noreferrer" className={linkClass}><CardIcon name={card.style.icon} />{card.content.label}</a> : null;
}
function ContactCard({ card }: Props<"CONTACT">) {
  const { name, email, phone, address, whatsapp } = card.content;
  const wa = whatsapp ? normalizeWhatsApp(whatsapp) : null;
  return <div className="space-y-3"><h2 className="font-bold">{name}</h2>{address && <p className="whitespace-pre-wrap text-sm">{address}</p>}<div className="public-links">
    {phone && <a className={linkClass} href={`tel:${phone.replace(/[^\d+]/g, "")}`} rel="noopener noreferrer"><Phone className="h-4 w-4" />{phone}</a>}
    {email && <a className={linkClass} href={`mailto:${email}`} rel="noopener noreferrer"><Mail className="h-4 w-4" />Email</a>}
    {wa && <a className={linkClass} href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
  </div></div>;
}
function MapCard({ card }: Props<"MAP">) {
  const c = card.content;
  const src = c.embedUrl && isGoogleMapsEmbed(c.embedUrl) ? c.embedUrl : c.latitude !== undefined && c.longitude !== undefined ? `https://www.google.com/maps?q=${c.latitude},${c.longitude}&z=${c.zoom}&output=embed` : null;
  return <figure><figcaption className="mb-3 font-medium">{c.label}</figcaption>{src && <iframe src={src} title={`Peta ${c.label}`} className="public-map" loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups" allowFullScreen />}</figure>;
}
function SocialCard({ card }: Props<"SOCIAL">) {
  return <nav aria-label="Media sosial" className="public-links">{card.content.links.map((link, i) => <a className={linkClass} key={i} href={link.url} target="_blank" rel="noopener noreferrer">{link.platform === "website" ? "Situs web" : link.platform}</a>)}</nav>;
}
function VideoCard({ card }: Props<"VIDEO_EMBED">) {
  const src = videoEmbedUrl(card.content.url);
  return src ? <iframe src={src} title={card.content.title} loading="lazy" className="public-video" sandbox="allow-scripts allow-same-origin allow-presentation" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : null;
}
function FileCard({ card }: Props<"FILE_DOWNLOAD">) {
  if (!assetUrlSchema.safeParse(card.content.url).success) return null;
  return <a href={card.content.url} download={card.content.fileName} target="_blank" rel="noopener noreferrer" className={linkClass}><CardIcon name={card.style.icon ?? "download"} />{card.content.label}</a>;
}
function DividerCard({ card }: Props<"DIVIDER">) {
  return <div>{card.content.label && <p className="mb-2 text-sm">{card.content.label}</p>}{card.style.lineStyle !== "none" && <hr className="public-divider" />}</div>;
}
function GalleryCard({ card, priority }: Props<"GALLERY">) {
  const carousel = card.style.layout === "carousel";
  return <div aria-label={carousel ? "Galeri geser, gunakan tombol panah untuk menggulir" : "Galeri gambar"} tabIndex={carousel ? 0 : undefined} className={carousel ? "public-gallery public-carousel" : "public-gallery public-grid"}>
    {card.content.images.map((image, i) => <figure key={i} className={carousel ? "w-full shrink-0 snap-center" : "min-w-0"}><div className="public-gallery-image"><SafeImage src={image.url} alt={image.alt} sizes={carousel ? "(max-width: 640px) calc(100vw - 64px), 960px" : `(max-width: 640px) ${Math.ceil(100 / card.style.columns)}vw, ${Math.ceil(960 / card.style.columns)}px`} className="object-cover" priority={priority && i === 0} /></div>{image.caption && <figcaption className="mt-1 text-xs">{image.caption}</figcaption>}</figure>)}
  </div>;
}

export function CardRenderer({ card: input, theme, showHidden = false, priority = false }: { card: ValidatedCard; theme: PageTheme; showHidden?: boolean; priority?: boolean }) {
  // Revalidate at the render boundary too: persisted/legacy data and callers are
  // not trusted merely because their TypeScript type says ValidatedCard.
  const checked = cardSchema.safeParse(input);
  if (!checked.success) return null;
  const card = checked.data;
  if (!card.isVisible && !showHidden) return null;
  const styles = cardVariables(card);
  void theme; // Theme CSS variables are inherited from PagePreview.
  const shadows = { none: "", sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg" };
  let content;
  switch (card.type) {
    case "TEXT": content = <TextCard card={card} />; break;
    case "IMAGE": content = <ImageCard card={card} priority={priority} />; break;
    case "LINK_BUTTON": content = <LinkCard card={card} />; break;
    case "CONTACT": content = <ContactCard card={card} />; break;
    case "MAP": content = <MapCard card={card} />; break;
    case "SOCIAL": content = <SocialCard card={card} />; break;
    case "VIDEO_EMBED": content = <VideoCard card={card} />; break;
    case "FILE_DOWNLOAD": content = <FileCard card={card} />; break;
    case "DIVIDER": content = <DividerCard card={card} />; break;
    case "GALLERY": content = <GalleryCard card={card} priority={priority} />; break;
  }
  return <section style={styles} className={`public-card ${shadows[card.style.shadow]}`} aria-label={card.type === "TEXT" && card.content.title ? card.content.title : undefined}>{!["LINK_BUTTON", "FILE_DOWNLOAD"].includes(card.type) && card.style.icon && <div className="mb-2"><CardIcon name={card.style.icon} /></div>}{content}</section>;
}
