import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(72).refine((value) => new TextEncoder().encode(value).length <= 72, "Kata sandi maksimal 72 byte."),
});

export const seedAdminSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(100),
  password: credentialsSchema.shape.password.refine((value) => value.length >= 12, "Kata sandi seed minimal 12 karakter."),
});
