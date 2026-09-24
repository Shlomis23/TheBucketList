"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateMemory } from "@/lib/dal/memories";
import { updateMemorySchema } from "@/lib/validation/memory";
import { fail, type Result } from "@/lib/errors/result";

// עריכת זיכרון — שני בני הזוג יכולים (החלטה מ-25.9, spec סעיף 16 #3).
// הצלחה מפנה חזרה למסך הזיכרון; כישלון מוחזר לטופס כדי שהטקסט יישאר.
export async function updateMemoryAction(
  input: unknown,
): Promise<Result<{ id: string; version: number }> | undefined> {
  const parsed = updateMemorySchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "INVALID_INPUT",
      "יש שגיאות בטופס",
      crypto.randomUUID(),
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const result = await updateMemory(parsed.data);
  if (!result.ok) return result;

  revalidatePath("/memories");
  revalidatePath(`/memories/${parsed.data.memoryId}`);
  revalidatePath("/");
  redirect(`/memories/${parsed.data.memoryId}`);
}
