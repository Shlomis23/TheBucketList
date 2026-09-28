import { z } from "zod";
import { recipeCourses, recipeClassifications, type RecipeCourse, type RecipeClassification } from "@/lib/recipes";

const sourceUrl = z.string().trim().max(2048).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}, "יש להזין קישור תקין שמתחיל ב־https://");

export const recipeSchema = z.object({
  id: z.uuid(),
  expectedVersion: z.number().int().positive().nullable(),
  title: z.string().trim().min(1, "יש להזין שם למתכון").max(120),
  course: z.enum(recipeCourses).nullable().default(null),
  classification: z.enum(recipeClassifications).nullable().default(null),
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

export function recipeMatchesFilters(recipe: { title: string; body: string; note: string; course: RecipeCourse | null; classification: RecipeClassification | null }, query: string, course: string, classification: string) {
  return recipeMatches(recipe, query)
    && (!course || (course === "unclassified" ? recipe.course === null : recipe.course === course))
    && (!classification || (classification === "unclassified" ? recipe.classification === null : recipe.classification === classification));
}
