"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createInvitation, revokeInvitation } from "@/lib/dal/invitations";
import { getMyProfile, setMyColorTheme, updateMyProfile } from "@/lib/dal/profile";
import { cookies } from "next/headers";
import { colorThemes, THEME_COOKIE, type ColorTheme } from "@/lib/themes";
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

// ערכת צבע (26.9): נשמרת בפרופיל (עוברת בין מכשירים) + עוגייה, כדי שהשרת
// יצבע את הדף מהטעינה הראשונה. הלקוח טוען את הדף מחדש אחרי זה (האיורים).
export async function setColorThemeAction(theme: unknown) {
  const parsed = colorThemes.includes(theme as ColorTheme) ? (theme as ColorTheme) : null;
  if (!parsed) return fail("INVALID_INPUT", "צבע לא מוכר", crypto.randomUUID());
  const result = await setMyColorTheme(parsed);
  if (result.ok) await writeThemeCookie(parsed);
  return result;
}

// מסנכרן את העוגייה לבחירה שבפרופיל (מכשיר חדש / שינוי ממכשיר אחר).
export async function syncThemeCookieAction(): Promise<ColorTheme | null> {
  const profile = await getMyProfile();
  if (!profile) return null;
  await writeThemeCookie(profile.colorTheme);
  return profile.colorTheme;
}

async function writeThemeCookie(theme: ColorTheme) {
  (await cookies()).set(THEME_COOKIE, theme, { path: "/", maxAge: 60 * 60 * 24 * 400, sameSite: "lax" });
}
