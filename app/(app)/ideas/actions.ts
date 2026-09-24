"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createIdea, setReaction } from "@/lib/dal/ideas";
import { createIdeaSchema } from "@/lib/validation/idea";
import type { Result } from "@/lib/errors/result";
import { fail } from "@/lib/errors/result";

export async function createIdeaAction(
  input: unknown,
): Promise<Result<{ id: string }> | undefined> {
  const parsed = createIdeaSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "INVALID_INPUT",
      "יש שגיאות בטופס",
      crypto.randomUUID(),
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const result = await createIdea(parsed.data);
  if (!result.ok) return result;

  revalidatePath("/ideas");
  revalidatePath("/");
  redirect("/ideas");
}

export async function setReactionAction(
  ideaId: string,
  preference: "yes" | "maybe" | "no" | null,
) {
  const result = await setReaction(ideaId, preference);
  if (result.ok) {
    revalidatePath("/ideas");
    revalidatePath(`/ideas/${ideaId}`);
    revalidatePath("/");
  }
  return result;
}
