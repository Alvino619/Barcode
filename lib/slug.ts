export const RESERVED_SLUGS = new Set([
  "admin", "api", "login", "logout", "signin", "signout", "auth", "p", "r",
  "_next", "uploads", "static", "assets", "public", "favicon", "robots",
  "sitemap", "new", "edit", "settings", "account", "register", "signup",
]);

export function generateSlug(title: string): string {
  const slug = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 60).replace(/-+$/, "");
  if (!slug) return "halaman";
  if (slug.length < 3 || RESERVED_SLUGS.has(slug)) return `halaman-${slug}`;
  return slug;
}
