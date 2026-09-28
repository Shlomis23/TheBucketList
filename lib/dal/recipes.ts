import "server-only";
import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getMySpaceId } from "@/lib/dal/space";
import { fail, ok } from "@/lib/errors/result";
import type { RecipeInput } from "@/lib/validation/recipe";

export type Recipe = { id: string; title: string; source_url: string | null; body: string; note: string; version: number; created_at: string };
const columns = "id,title,source_url,body,note,version,created_at";

export async function listRecipes(): Promise<Recipe[]> {
  const spaceId = await getMySpaceId();
  if (!spaceId) return [];
  const supabase = await createSupabaseServerClient();
  // Page through results so the API row limit never silently hides recipes.
  const recipes: Recipe[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("recipes").select(columns).eq("space_id", spaceId)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + 499).returns<Recipe[]>();
    if (error) throw new Error("לא הצלחנו לטעון את המתכונים");
    recipes.push(...(data ?? []));
    if (!data || data.length < 500) return recipes;
  }
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("recipes").select(columns).eq("id", id).maybeSingle<Recipe>();
  if (error) throw new Error("לא הצלחנו לטעון את המתכון");
  return data;
}

function recipeError(message?: string) {
  const requestId = crypto.randomUUID();
  if (message?.includes("VERSION_CONFLICT")) return fail("VERSION_CONFLICT", "המתכון השתנה בינתיים. רעננו את הדף לפני שמירת השינויים.", requestId);
  if (message?.includes("NOT_FOUND") || message?.includes("NOT_MEMBER")) return fail("NOT_FOUND", "המתכון או המרחב כבר אינם זמינים.", requestId);
  return fail("UNEXPECTED", "הפעולה לא הצליחה. נסו שוב.", requestId);
}

export async function saveRecipe(input: RecipeInput) {
  const actor = await getVerifiedUserId();
  if (!actor) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", crypto.randomUUID());
  const { data, error } = await createSupabaseServiceClient().rpc("save_recipe", {
    p_actor: actor, p_id: input.id, p_expected_version: input.expectedVersion,
    p_title: input.title, p_source_url: input.sourceUrl || null, p_body: input.body, p_note: input.note,
  });
  if (error || !data) return recipeError(error?.message);
  return ok({ id: (data as Recipe).id }, crypto.randomUUID());
}

export async function deleteRecipe(id: string, expectedVersion: number) {
  const actor = await getVerifiedUserId();
  if (!actor) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", crypto.randomUUID());
  const { data, error } = await createSupabaseServiceClient().rpc("delete_recipe", { p_actor: actor, p_id: id, p_expected_version: expectedVersion });
  if (error || data !== true) return recipeError(error?.message);
  return ok({ deleted: true }, crypto.randomUUID());
}
