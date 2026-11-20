import { z } from "zod";
import { cardSchema } from "./card";
import { pageInputSchema, pageThemeSchema } from "./page";

export const builderCardSchema = z.strictObject({
  id: z.union([z.string().cuid(), z.uuid()], { error: "ID kartu tidak valid." }),
  data: cardSchema,
});
export const builderDocumentSchema = z.strictObject({
  page: pageInputSchema.omit({ lifetime: true }),
  theme: pageThemeSchema,
  cards: z.array(builderCardSchema).max(100, "Maksimal 100 kartu per halaman.")
    .refine((cards) => new Set(cards.map((card) => card.id)).size === cards.length, "ID kartu harus unik."),
});
export const saveBuilderSchema = z.strictObject({
  updatedAt: z.iso.datetime(),
  document: builderDocumentSchema,
});
export type BuilderDocument = z.output<typeof builderDocumentSchema>;
export type BuilderCard = BuilderDocument["cards"][number];
export type BuilderState = { updatedAt: string; document: BuilderDocument };

export function reorderCards(cards: BuilderCard[], activeId: string, overId: string): BuilderCard[] {
  const from = cards.findIndex((card) => card.id === activeId);
  const to = cards.findIndex((card) => card.id === overId);
  if (from < 0 || to < 0 || from === to) return cards;
  const result = [...cards];
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result.map((card, order) => ({ ...card, data: { ...card.data, order } }));
}

export function versionMatches(actual: Date | string, expected: string) {
  return new Date(actual).toISOString() === expected;
}
