import { describe, expect, it } from "vitest";
import { generateSlug, RESERVED_SLUGS } from "@/lib/slug";
import { pageInputSchema, slugSchema } from "@/lib/schemas/page";

describe("generator dan validasi slug", () => {
  it.each([
    ["Café Déjà Vu!", "cafe-deja-vu"], ["  KOPI   & Roti  ", "kopi-roti"],
    ["日本語", "halaman"], ["a", "halaman-a"], ["Admin", "halaman-admin"],
  ])("mengubah %s menjadi %s", (title, expected) => expect(generateSlug(title)).toBe(expected));
  it("membatasi panjang dan menghapus tanda hubung pada ujung", () => {
    const slug = generateSlug("a".repeat(59) + " sesuatu");
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });
  it("menolak seluruh slug reserved", () => {
    for (const slug of RESERVED_SLUGS) expect(slugSchema.safeParse(slug).success, slug).toBe(false);
  });
  it.each(["ab", "a".repeat(61), "-halaman", "halaman-", "Halo", "halo dunia", "halo/dunia", "café", "_next"])("menolak %s", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(false);
  });
  it("menolak mass assignment dan URL gambar asing", () => {
    expect(pageInputSchema.safeParse({ title: "Tes", slug: "tes", ownerId: "other" }).success).toBe(false);
    expect(pageInputSchema.safeParse({ title: "Tes", slug: "tes", logo: "https://evil.example/image.png" }).success).toBe(false);
    expect(pageInputSchema.safeParse({ title: " ", slug: "tes" }).success).toBe(false);
  });
});
