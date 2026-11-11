import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { seedAdminSchema } from "../lib/schemas/auth";
import { cardSchema, type CardInput } from "../lib/schemas/card";
import { pageThemeSchema } from "../lib/schemas/page";

const prisma = new PrismaClient();

async function main() {
  const admin = seedAdminSchema.parse({
    name: process.env.SEED_ADMIN_NAME ?? "Administrator",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  const examples: CardInput[] = [
    { type: "TEXT", order: 0, content: { text: "Selamat datang! Temukan informasi dan kontak kami di halaman ini." } },
    { type: "LINK_BUTTON", order: 1, content: { label: "Kunjungi situs kami", url: "https://example.com" } },
    { type: "CONTACT", order: 2, content: { name: "Tim Layanan", email: "halo@example.com", phone: "+62 812 3456 7890" } },
    { type: "DIVIDER", order: 3, content: { label: "Terima kasih sudah berkunjung" } },
  ];
  const cards = examples.map((card) => cardSchema.parse(card));
  const passwordHash = await hash(admin.password, 12);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: admin.email }, update: {},
      create: { name: admin.name, email: admin.email, passwordHash, role: "ADMIN" },
    });
    if (user.role !== "ADMIN") throw new Error("Email seed sudah dipakai akun non-admin.");
    const existingPage = await tx.page.findUnique({ where: { slug: "halaman-contoh" } });
    if (existingPage && existingPage.ownerId !== user.id) throw new Error("Slug halaman-contoh sudah dimiliki pengguna lain.");
    await tx.page.upsert({
      where: { slug: "halaman-contoh" }, update: {},
      create: {
        ownerId: user.id, title: "Halaman Contoh", slug: "halaman-contoh",
        description: "Contoh halaman dengan empat kartu.", isPublished: false,
        theme: pageThemeSchema.parse({}), cards: { create: cards },
      },
    });
  });
  console.info("Seed selesai: admin dan halaman contoh tersedia.");
}

main().catch((error: unknown) => {
  // Never log validation input, which may contain the seed password.
  console.error(error instanceof Error ? error.message : "Seed gagal.");
  process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); });
