"use server";
import { revalidatePath } from "next/cache";
import { recipeSchema, deleteRecipeSchema } from "@/lib/validation/recipe";
import { saveRecipe, deleteRecipe } from "@/lib/dal/recipes";
import { fail } from "@/lib/errors/result";

// Recipes are a quiet shared library: no idea, match or notification calls.
export async function saveRecipeAction(input: unknown) {
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "יש לבדוק את פרטי המתכון", crypto.randomUUID(), parsed.error.flatten().fieldErrors);
  const result = await saveRecipe(parsed.data);
  if (result.ok) revalidatePath("/ideas/recipes", "layout");
  return result;
}
export async function deleteRecipeAction(input: unknown) {
  const parsed = deleteRecipeSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "בקשה לא תקינה", crypto.randomUUID());
  const result = await deleteRecipe(parsed.data.id, parsed.data.expectedVersion);
  if (result.ok) revalidatePath("/ideas/recipes", "layout");
  return result;
}
