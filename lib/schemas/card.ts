import { z } from "zod";

export const webUrlSchema = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
}, "Gunakan URL HTTP atau HTTPS tanpa kredensial.");

export const assetUrlSchema = z.union([
  webUrlSchema,
  z.string().regex(/^\/uploads\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/, "Path unggahan tidak valid."),
]);
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Gunakan warna hex enam digit.");
const label = z.string().trim().min(1).max(200);
const image = z.strictObject({ url: assetUrlSchema, alt: label, caption: z.string().max(500).optional() });

export const cardStyleSchema = z.strictObject({
  backgroundColor: colorSchema.default("#ffffff"),
  textColor: colorSchema.default("#0f172a"),
  radius: z.number().int().min(0).max(64).default(16),
  shadow: z.enum(["none", "sm", "md", "lg"]).default("sm"),
  padding: z.number().int().min(0).max(64).default(24),
  alignment: z.enum(["left", "center", "right"]).default("left"),
  icon: z.string().regex(/^[a-z][a-z0-9-]*$/).max(80).optional(),
});

const common = { order: z.number().int().min(0).default(0), isVisible: z.boolean().default(true) };

// Each branch validates content and style together so the selected type controls both.
export const cardSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...common, type: z.literal("TEXT"), content: z.strictObject({ text: z.string().trim().min(1).max(10000) }), style: cardStyleSchema.extend({ fontSize: z.number().int().min(12).max(72).default(16), fontWeight: z.enum(["normal", "medium", "bold"]).default("normal") }).default(() => ({ ...cardStyleSchema.parse({}), fontSize: 16, fontWeight: "normal" as const })) }),
  z.strictObject({ ...common, type: z.literal("IMAGE"), content: image, style: cardStyleSchema.extend({ objectFit: z.enum(["cover", "contain"]).default("cover") }).prefault({}) }),
  z.strictObject({ ...common, type: z.literal("LINK_BUTTON"), content: z.strictObject({ label, url: webUrlSchema, openInNewTab: z.boolean().default(true) }), style: cardStyleSchema.prefault({}) }),
  z.strictObject({ ...common, type: z.literal("CONTACT"), content: z.strictObject({ name: label, email: z.email().optional(), phone: z.string().regex(/^\+?[0-9 ()-]{6,30}$/).optional(), address: z.string().trim().min(1).max(500).optional() }).refine((value) => value.email || value.phone || value.address, "Isi minimal satu metode kontak."), style: cardStyleSchema.prefault({}) }),
  z.strictObject({ ...common, type: z.literal("MAP"), content: z.strictObject({ label, latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), zoom: z.number().int().min(1).max(20).default(15) }), style: cardStyleSchema.extend({ height: z.number().int().min(150).max(800).default(300) }).prefault({}) }),
  z.strictObject({ ...common, type: z.literal("SOCIAL"), content: z.strictObject({ links: z.array(z.strictObject({ platform: z.enum(["instagram", "facebook", "x", "linkedin", "youtube", "tiktok", "whatsapp", "github", "website"]), url: webUrlSchema })).min(1).max(20) }), style: cardStyleSchema.prefault({}) }),
  z.strictObject({ ...common, type: z.literal("VIDEO_EMBED"), content: z.strictObject({ title: label, url: webUrlSchema.refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return url.protocol === "https:" && ["youtube.com", "www.youtube.com", "youtu.be", "www.youtube-nocookie.com", "vimeo.com", "player.vimeo.com"].includes(url.hostname);
  }, "Gunakan URL HTTPS YouTube atau Vimeo.") }), style: cardStyleSchema.extend({ aspectRatio: z.enum(["16:9", "4:3", "1:1"]).default("16:9") }).prefault({}) }),
  z.strictObject({ ...common, type: z.literal("FILE_DOWNLOAD"), content: z.strictObject({ label, url: assetUrlSchema, fileName: z.string().min(1).max(255).regex(/^[^/\\\x00-\x1f]+$/) }), style: cardStyleSchema.prefault({}) }),
  z.strictObject({ ...common, type: z.literal("DIVIDER"), content: z.strictObject({ label: z.string().max(100).optional() }), style: cardStyleSchema.extend({ lineStyle: z.enum(["solid", "dashed", "dotted"]).default("solid"), thickness: z.number().int().min(1).max(8).default(1) }).prefault({}) }),
  z.strictObject({ ...common, type: z.literal("GALLERY"), content: z.strictObject({ images: z.array(image).min(1).max(30) }), style: cardStyleSchema.extend({ columns: z.number().int().min(1).max(4).default(2), gap: z.number().int().min(0).max(32).default(12) }).prefault({}) }),
]);

export type CardInput = z.input<typeof cardSchema>;
export type ValidatedCard = z.output<typeof cardSchema>;
