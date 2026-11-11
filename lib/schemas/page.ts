import { z } from "zod";
import { colorSchema } from "./card";

export const pageThemeSchema = z.strictObject({
  backgroundColor: colorSchema.default("#f8fafc"),
  textColor: colorSchema.default("#0f172a"),
  font: z.enum(["sans", "serif", "mono"]).default("sans"),
  backgroundStyle: z.enum(["solid", "gradient", "dots"]).default("solid"),
  defaultRadius: z.number().int().min(0).max(64).default(16),
});
