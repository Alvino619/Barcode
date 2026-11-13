import { describe, expect, it } from "vitest";
import { normalizeWhatsApp, videoEmbedUrl, isGoogleMapsEmbed, isSocialUrl, safeLink, contrastRatio } from "@/lib/card-links";
import { reorderCards, versionMatches, builderDocumentSchema } from "@/lib/schemas/builder";
import { cardSchema } from "@/lib/schemas/card";
import { pageThemeSchema } from "@/lib/schemas/page";

describe("tautan kartu", () => {
  it.each([["0812 3456 7890", "6281234567890"], ["+62-812-3456-7890", "6281234567890"], ["81234567890", "6281234567890"], ["+14155552671", "14155552671"], ["+819012345678", "819012345678"]])("normalisasi WhatsApp %s", (input, output) => expect(normalizeWhatsApp(input)).toBe(output));
  it.each(["javascript:12345678", "0812abc123456", "000", "+00012345678", "081234567890123456789"])("menolak nomor %s", (input) => expect(normalizeWhatsApp(input)).toBeNull());
  it.each(["https://youtu.be/dQw4w9WgXcQ?t=5", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"])("mengubah YouTube %s", (url) => expect(videoEmbedUrl(url)).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"));
  it.each(["https://vimeo.com/12345678", "https://player.vimeo.com/video/12345678"])("mengubah Vimeo %s", (url) => expect(videoEmbedUrl(url)).toBe("https://player.vimeo.com/video/12345678"));
  it.each(["https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ", "https://youtube.com@evil.example", "javascript:alert(1)", "http://youtu.be/dQw4w9WgXcQ", "https://youtube.com/watch?v=bad", "https://vimeo.com/settings"])("menolak video %s", (url) => expect(videoEmbedUrl(url)).toBeNull());
  it("memvalidasi host Maps dan sosial secara tepat", () => {
    expect(isGoogleMapsEmbed("https://www.google.com/maps/embed?pb=123")).toBe(true);
    expect(isGoogleMapsEmbed("https://www.google.com.evil.example/maps/embed")).toBe(false);
    expect(isGoogleMapsEmbed("https://www.google.com/url?url=https://evil.example")).toBe(false);
    expect(isGoogleMapsEmbed("https://www.google.com:4444/maps/embed")).toBe(false);
    expect(isSocialUrl("instagram", "https://www.instagram.com/example")).toBe(true);
    expect(isSocialUrl("instagram", "https://instagram.com.evil.example/example")).toBe(false);
    expect(isSocialUrl("instagram", "https://facebook.com/example")).toBe(false);
    expect(isSocialUrl("website", "https://example.com")).toBe(true);
  });
  it("hanya menerima skema tautan yang diizinkan", () => {
    for (const value of ["https://example.com", "http://example.com", "tel:+6281234567890", "mailto:halo@example.com"]) expect(safeLink(value)).toBe(true);
    for (const value of ["javascript:alert(1)", "data:text/html,test", "file:///tmp/x", "//evil.example", "mailto:a%0Abcc@example.com"]) expect(safeLink(value)).toBe(false);
  });
  it("menghitung kontras WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5);
  });
});

describe("reorder, skema, dan versi", () => {
  const cards = ["a", "b", "c"].map((id, order) => ({ id, data: cardSchema.parse({ type: "TEXT", order, content: { text: id } }) }));
  it("memindahkan kartu tanpa mengubah data asli, dengan urutan rapat", () => {
    const moved = reorderCards(cards, "c", "a");
    expect(moved.map((card) => card.id)).toEqual(["c", "a", "b"]);
    expect(moved.map((card) => card.data.order)).toEqual([0, 1, 2]);
    expect(cards.map((card) => card.id)).toEqual(["a", "b", "c"]);
    expect(reorderCards(cards, "missing", "a")).toBe(cards);
    expect(reorderCards(cards, "a", "a")).toBe(cards);
  });
  it("membedakan versi walaupun hanya selisih satu milidetik", () => {
    expect(versionMatches(new Date("2026-11-12T00:00:00.001Z"), "2026-11-12T00:00:00.001Z")).toBe(true);
    expect(versionMatches("2026-11-12T00:00:00.002Z", "2026-11-12T00:00:00.001Z")).toBe(false);
  });
  it("mengisi default tema lama dan menolak content asing", () => {
    const theme = pageThemeSchema.parse({ backgroundColor: "#ffffff", textColor: "#000000", font: "sans", backgroundStyle: "solid", defaultRadius: 16 });
    expect(theme.contentWidth).toBe(640); expect(theme.cardGap).toBe(16);
    expect(cardSchema.safeParse({ type: "TEXT", content: { text: "Halo", html: "<script>" } }).success).toBe(false);
    expect(builderDocumentSchema.safeParse({ page: { title: "Tes", slug: "tes" }, theme, cards: [{ ...cards[0], id: "../../x" }] }).success).toBe(false);
  });
});
