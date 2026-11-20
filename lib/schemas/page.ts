import { z } from "zod";
import { colorSchema } from "./card";
import { RESERVED_SLUGS } from "../slug";

export const pageIdSchema = z.string().cuid("ID halaman tidak valid.");
export const slugSchema = z.string().min(3, "Slug minimal 3 karakter.")
  .max(60, "Slug maksimal 60 karakter.")
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Gunakan huruf kecil, angka, dan tanda hubung di antara kata.")
  .refine((slug) => !RESERVED_SLUGS.has(slug), "Slug ini dicadangkan oleh sistem.");

export const imageKeySchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/, "Nama file tidak valid.");
export const uploadKeySchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|pdf|doc|docx|xls|xlsx)$/, "Nama file tidak valid.");
export const uploadUrlSchema = z.string().refine((url) => url.startsWith("/uploads/") && uploadKeySchema.safeParse(url.slice(9)).success, "URL unggahan tidak valid.");
export const imageUrlSchema = z.string().refine((url) => url.startsWith("/uploads/") && imageKeySchema.safeParse(url.slice(9)).success, "Pilih gambar dari unggahan aplikasi.");

export const pageInputSchema = z.strictObject({
  title: z.string().trim().min(1, "Judul wajib diisi."),
  slug: slugSchema,
  description: z.string().trim().max(2000, "Deskripsi maksimal 2.000 karakter.").default(""),
  logo: imageUrlSchema.nullable().default(null),
  coverImage: imageUrlSchema.nullable().default(null),
  isPublished: z.boolean().default(false),
  lifetime: z.enum(["permanent", "temporary"]).optional(),
});
export type PageInput = z.infer<typeof pageInputSchema>;
export const pageQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  status: z.enum(["all", "published", "draft"]).default("all"),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
});
export const slugQuerySchema = z.object({ slug: slugSchema, pageId: pageIdSchema.optional() });
export const deletePageSchema = z.strictObject({ title: z.string().min(1) });
export const uploadContextSchema = z.object({ pageId: pageIdSchema.optional() });
export const deleteUploadSchema = z.strictObject({ url: uploadUrlSchema, pageId: pageIdSchema.optional() });

export const pageThemeSchema = z.strictObject({
  backgroundColor: colorSchema.default("#f8fafc"),
  textColor: colorSchema.default("#0f172a"),
  font: z.enum(["sans", "serif", "mono", "inter", "lora", "roboto-mono", "poppins", "nunito", "playfair"]).default("sans"),
  backgroundStyle: z.enum(["solid", "gradient", "dots", "image"]).default("solid"),
  backgroundImage: imageUrlSchema.nullable().default(null),
  showFooter: z.boolean().default(true),
  noIndex: z.boolean().default(false),
  gradientColor: colorSchema.default("#d1fae5"),
  contentWidth: z.number().int().min(280).max(960).default(640),
  cardGap: z.number().int().min(0).max(64).default(16),
  defaultRadius: z.number().int().min(0).max(64).default(16),
});

export type PageTheme = z.output<typeof pageThemeSchema>;
