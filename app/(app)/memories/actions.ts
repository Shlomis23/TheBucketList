"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { updateMemory } from "@/lib/dal/memories";
import { deletePhoto } from "@/lib/dal/photos";
import { notifyPartner } from "@/lib/push";
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

// מחיקת תמונה — כל אחד מבני הזוג, במרחב פתוח (נאכף ב-begin_delete_photo, 0029). ההעלאה עצמה היא
// Route Handler (app/api/memories/[id]/photos) בגלל גודל הגוף.
const deletePhotoSchema = z.object({ memoryId: z.uuid(), photoId: z.uuid() });

export async function deletePhotoAction(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = deletePhotoSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "בקשה לא תקינה", crypto.randomUUID());

  const result = await deletePhoto(parsed.data.photoId);
  if (result.ok) {
    revalidatePath(`/memories/${parsed.data.memoryId}`);
    revalidatePath("/memories");
    revalidatePath("/");
  }
  return result;
}

// אחרי שסבב העלאה נגמר (לא על כל תמונה — כדי לא להציף את בן/בת הזוג
// בעשר התראות): התראה אחת "3 תמונות חדשות".
const photosUploadedSchema = z.object({ memoryId: z.uuid(), count: z.number().int().min(1).max(10) });

export async function photosUploadedAction(input: unknown): Promise<void> {
  const parsed = photosUploadedSchema.safeParse(input);
  if (!parsed.success) return;
  notifyPartner({ kind: "photos_added", memoryId: parsed.data.memoryId, count: parsed.data.count });
}
