import { z } from "zod";

const sourceUrl = z.string().trim().max(2048).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}, "יש להזין קישור תקין שמתחיל ב־https://");

export const recipeSchema = z.object({
  id: z.uuid(),
  expectedVersion: z.number().int().positive().nullable(),
  title: z.string().trim().min(1, "יש להזין שם למתכון").max(120),
  sourceUrl: sourceUrl.default(""),
  body: z.string().trim().max(20000).default(""),
  note: z.string().trim().max(3000).default(""),
});
export const deleteRecipeSchema = recipeSchema.pick({ id: true }).extend({ expectedVersion: z.number().int().positive() });
export type RecipeInput = z.infer<typeof recipeSchema>;
export function recipeMatches(recipe: { title: string; body: string; note: string }, query: string) {
  const needle = query.trim().toLocaleLowerCase("he");
  return !needle || [recipe.title, recipe.body, recipe.note].some((text) => text.toLocaleLowerCase("he").includes(needle));
}
