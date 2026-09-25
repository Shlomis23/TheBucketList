"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createIdea, setReaction, archiveIdea, restoreIdea, updateIdea } from "@/lib/dal/ideas";
import { createIdeaSchema, updateIdeaSchema } from "@/lib/validation/idea";
import { addComment, editComment, deleteComment } from "@/lib/dal/comments";
import { addCommentSchema, editCommentSchema, deleteCommentSchema } from "@/lib/validation/comment";
import type { Result } from "@/lib/errors/result";
import { fail } from "@/lib/errors/result";
import { notifyPartner } from "@/lib/push";

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
  notifyPartner({ kind: "idea_created", ideaId: result.data.id });

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

export async function archiveIdeaAction(ideaId: string, expectedVersion: number) {
  const result = await archiveIdea(ideaId, expectedVersion);
  if (result.ok) {
    revalidatePath("/ideas");
    revalidatePath(`/ideas/${ideaId}`);
    revalidatePath("/");
  }
  return result;
}

export async function restoreIdeaAction(ideaId: string, expectedVersion: number) {
  const result = await restoreIdea(ideaId, expectedVersion);
  if (result.ok) {
    revalidatePath("/ideas");
    revalidatePath(`/ideas/${ideaId}`);
    revalidatePath("/");
  }
  return result;
}

export async function updateIdeaAction(
  input: unknown,
): Promise<Result<{ id: string; version: number }> | undefined> {
  const parsed = updateIdeaSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "INVALID_INPUT",
      "יש שגיאות בטופס",
      crypto.randomUUID(),
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const result = await updateIdea(parsed.data);
  if (!result.ok) return result;

  revalidatePath("/ideas");
  revalidatePath(`/ideas/${parsed.data.ideaId}`);
  revalidatePath("/");
  redirect(`/ideas/${parsed.data.ideaId}`);
}

// תגובות טקסט (0017). revalidate לדף הרעיון (השיחה) ולרשימה (מונה ההודעות).
function revalidateComments(ideaId: string) {
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
}

function invalid(parsedError: { flatten: () => { fieldErrors: unknown } }) {
  return fail(
    "INVALID_INPUT",
    "ההודעה לא תקינה",
    crypto.randomUUID(),
    parsedError.flatten().fieldErrors as Record<string, string[]>,
  );
}

export async function addCommentAction(input: unknown) {
  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await addComment(parsed.data);
  if (result.ok) {
    revalidateComments(parsed.data.ideaId);
    notifyPartner({ kind: "comment_added", ideaId: parsed.data.ideaId, body: parsed.data.body });
  }
  return result;
}

export async function editCommentAction(input: unknown) {
  const parsed = editCommentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await editComment(parsed.data);
  if (result.ok) revalidateComments(parsed.data.ideaId);
  return result;
}

export async function deleteCommentAction(input: unknown) {
  const parsed = deleteCommentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await deleteComment(parsed.data);
  if (result.ok) revalidateComments(parsed.data.ideaId);
  return result;
}
