import { z } from "zod";

const baseUrlSchema = z.string().url().refine((value) => {
  const parsed = new URL(value);
  return ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password;
}, "NEXT_PUBLIC_APP_URL harus berupa URL HTTP(S) yang valid.");

const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const parsedUrl = baseUrlSchema.safeParse(configuredUrl);
if (!parsedUrl.success) throw new Error(parsedUrl.error.issues[0]?.message ?? "NEXT_PUBLIC_APP_URL tidak valid.");

export const appBaseUrl = new URL(parsedUrl.data).origin;
