import { z } from "zod";

export const statsRangeSchema = z.enum(["7d", "30d", "90d", "custom"]);
const dateSchema = z.iso.date();
export const customStatsRangeSchema = z.object({ from: dateSchema, to: dateSchema }).superRefine(({ from, to }, ctx) => {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (end < start) ctx.addIssue({ code: "custom", message: "Tanggal akhir harus sama atau setelah tanggal awal.", path: ["to"] });
  if (end >= start && (end - start) / 86_400_000 > 89) ctx.addIssue({ code: "custom", message: "Rentang kustom maksimal 90 hari.", path: ["to"] });
});

export const csvSafetySchema = z.string();
