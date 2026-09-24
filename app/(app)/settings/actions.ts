"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createInvitation, revokeInvitation } from "@/lib/dal/invitations";
import { updateMyProfile } from "@/lib/dal/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeInviteCookie } from "@/lib/invitations/cookie";
import { createInvitationSchema, invitationIdSchema } from "@/lib/validation/invitation";
import type { Result } from "@/lib/errors/result";
import { fail } from "@/lib/errors/result";

export async function createInvitationAction(
  input: unknown,
): Promise<Result<{ id: string; link: string; expiresAt: string; maskedEmail: string }>> {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "INVALID_INPUT",
      "כתובת אימייל לא תקינה",
      crypto.randomUUID(),
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const result = await createInvitation(parsed.data.targetEmail);
  if (result.ok) revalidatePath("/settings");
  return result;
}

export async function revokeInvitationAction(input: unknown): Promise<Result<{ revoked: true }>> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "בקשה לא תקינה", crypto.randomUUID());

  const result = await revokeInvitation(parsed.data.invitationId);
  if (result.ok) revalidatePath("/settings");
  return result;
}

// שם התצוגה שלי — מופיע אצל בן/בת הזוג ("חדש מ[שם]", "נשמר ע״י", אישורי
// תוכנית). update_my_profile (0006) כבר קיים; כאן רק מסך. אימות אורך נעשה
// ב-updateMyProfile (1-60) ובשרת.
export async function updateDisplayNameAction(
  displayName: string,
): Promise<Result<{ id: string; displayName: string }>> {
  if (typeof displayName !== "string") return fail("INVALID_INPUT", "שם לא תקין", crypto.randomUUID());
  const result = await updateMyProfile(displayName);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/");
    revalidatePath("/memories", "layout");
    revalidatePath("/plans", "layout");
  }
  return result;
}

// יציאה מהחשבון — spec סעיף 5/6: מנקה את ה-session *במכשיר הזה* בלבד
// (scope: "local" — לא מנתק את הטלפון של בן/בת הזוג או מכשירים אחרים שלי),
// ואת cookie ההזמנה הזמני אם נשאר. redirect מנקה גם את ה-Router Cache של
// הלקוח, כך ש"אחורה" לא מציג תוכן זוגי מהזיכרון. אין Service Worker/cache
// מקומי עם תוכן פרטי שצריך לנקות (spec 11.4).
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  await consumeInviteCookie();
  revalidatePath("/", "layout");
  redirect("/login");
}
