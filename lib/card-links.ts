export function safeWebUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch { return null; }
}

export function normalizeWhatsApp(value: string): string | null {
  if (!/^\+?[\d ()-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    if (value.startsWith("+") || !digits.startsWith("08")) return null;
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8") && !value.startsWith("+")) digits = `62${digits}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function safeLink(value: string): boolean {
  if (safeWebUrl(value)) return true;
  if (value.startsWith("tel:")) return /^tel:\+?[\d ()-]{6,30}$/.test(value);
  if (value.startsWith("mailto:")) return !value.includes("%") && /^mailto:[^\s@?\r\n]+@[^\s@?\r\n]+\.[a-zA-Z]{2,}$/.test(value);
  return false;
}

export function videoEmbedUrl(value: string): string | null {
  const url = safeWebUrl(value);
  if (!url || url.protocol !== "https:") return null;
  let id: string | null = null;
  if (url.hostname === "youtu.be") id = url.pathname.split("/")[1];
  if (["youtube.com", "www.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
    id = url.pathname === "/watch" ? url.searchParams.get("v") : /^\/(embed|shorts|live)\/([^/]+)\/?$/.exec(url.pathname)?.[2] ?? null;
  }
  if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
    const match = /^\/(?:video\/)?(\d{1,12})\/?$/.exec(url.pathname);
    if (match) return `https://player.vimeo.com/video/${match[1]}`;
  }
  return null;
}

export function isGoogleMapsEmbed(value: string): boolean {
  const url = safeWebUrl(value);
  return Boolean(url && url.protocol === "https:" && !url.port && ["www.google.com", "maps.google.com"].includes(url.hostname)
    && /^\/maps\/embed(?:\/v1\/(?:place|view|directions|search|streetview))?\/?$/.test(url.pathname));
}

export const socialPlatforms = ["instagram", "facebook", "x", "linkedin", "youtube", "tiktok", "whatsapp", "github", "website"] as const;
export type SocialPlatform = typeof socialPlatforms[number];
const socialHosts: Record<Exclude<SocialPlatform, "website">, string[]> = {
  instagram: ["instagram.com", "www.instagram.com"], facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com"],
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"], linkedin: ["linkedin.com", "www.linkedin.com"],
  youtube: ["youtube.com", "www.youtube.com", "youtu.be"], tiktok: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"],
  whatsapp: ["wa.me", "api.whatsapp.com", "www.whatsapp.com", "whatsapp.com"], github: ["github.com", "www.github.com"],
};
export function isSocialUrl(platform: SocialPlatform, value: string) {
  const url = safeWebUrl(value);
  return Boolean(url && (platform === "website" || socialHosts[platform].includes(url.hostname)));
}

export function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
