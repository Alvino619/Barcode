import assert from "node:assert/strict";
import { test } from "vitest";
import { CardType } from "@prisma/client";
import { cardSchema, type CardInput } from "../lib/schemas/card";
import { pageThemeSchema } from "../lib/schemas/page";
import { credentialsSchema } from "../lib/schemas/auth";

const examples: CardInput[] = [
  { type: "TEXT", content: { text: "Halo" } },
  { type: "IMAGE", content: { url: "/uploads/foto.jpg", alt: "Foto" } },
  { type: "LINK_BUTTON", content: { label: "Situs", url: "https://example.com" } },
  { type: "CONTACT", content: { name: "Tim", email: "halo@example.com" } },
  { type: "MAP", content: { label: "Kantor", latitude: -6.2, longitude: 106.8 } },
  { type: "SOCIAL", content: { links: [{ platform: "instagram", url: "https://instagram.com/example" }] } },
  { type: "VIDEO_EMBED", content: { title: "Video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
  { type: "FILE_DOWNLOAD", content: { label: "Brosur", url: "/uploads/brosur.pdf", fileName: "brosur.pdf" } },
  { type: "DIVIDER", content: {} },
  { type: "GALLERY", content: { images: [{ url: "https://example.com/foto.jpg", alt: "Foto" }] } },
];

test("semua enum Prisma memiliki validasi content dan default style", () => {
  assert.deepEqual(examples.map((card) => card.type).sort(), Object.values(CardType).sort());
  for (const example of examples) {
    const result = cardSchema.parse(example);
    assert.equal(result.isVisible, true);
    assert.equal(result.style.radius, 16);
  }
});

test("menolak content yang tidak cocok dengan tipe dan properti asing", () => {
  assert.equal(cardSchema.safeParse({ type: "TEXT", content: { url: "https://example.com" } }).success, false);
  assert.equal(cardSchema.safeParse({ ...examples[0], ownerId: "injected" }).success, false);
  assert.equal(cardSchema.safeParse({ ...examples[0], style: { columns: 2 } }).success, false);
});

test("menolak URL berbahaya, embed asing, dan path traversal", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "//evil.example", "https://user:password@example.com"]) {
    assert.equal(cardSchema.safeParse({ type: "LINK_BUTTON", content: { label: "Tes", url } }).success, false);
  }
  assert.equal(cardSchema.safeParse({ type: "IMAGE", content: { url: "/uploads/../secret", alt: "Tes" } }).success, false);
  assert.equal(cardSchema.safeParse({ type: "VIDEO_EMBED", content: { title: "Tes", url: "https://youtube.com.evil.example" } }).success, false);
});

test("memvalidasi batas koordinat, galeri, kontak, dan style", () => {
  assert.equal(cardSchema.safeParse({ type: "MAP", content: { label: "Tes", latitude: 91, longitude: 0 } }).success, false);
  assert.equal(cardSchema.safeParse({ type: "GALLERY", content: { images: [] } }).success, false);
  assert.equal(cardSchema.safeParse({ type: "CONTACT", content: { name: "Tes" } }).success, false);
  for (const style of [{ padding: -1 }, { radius: 65 }, { alignment: "justify" }, { textColor: "red;display:none" }]) {
    assert.equal(cardSchema.safeParse({ ...examples[0], style }).success, false);
  }
  assert.equal(pageThemeSchema.safeParse({ defaultRadius: -1 }).success, false);
});

test("menolak kata sandi melebihi batas byte bcrypt", () => {
  assert.equal(credentialsSchema.safeParse({ email: "admin@example.com", password: "🙂".repeat(19) }).success, false);
});
