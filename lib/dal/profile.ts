import "server-only";

import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";

// getMyProfile — קריאה בלבד, דרך client עם JWT המשתמש (profiles_read/
// can_read_profile מרשה קריאת הפרופיל של עצמך תמיד). משמש כדי להחליט אם
// צריך לבקש שם תצוגה לפני accept_invitation_internal (הפרופיל חייב
// להתקיים לפני קבלת הזמנה — spec סעיף 10.3).
export async function getMyProfile(): Promise<{ id: string; displayName: string } | null> {
  const userId = await getVerifiedUserId();
  if (!userId) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", userId)
    .maybeSingle<{ id: string; display_name: string }>();

  return data ? { id: data.id, displayName: data.display_name } : null;
}

// שם התצוגה של בן/בת הזוג (null אם עוד אין, או בלי שם). RLS (can_read_profile)
// מחזיר רק אותי ואת בן/בת הזוג במרחב פתוח — אז "מי שאינו אני" הוא בן/בת הזוג.
export async function getPartnerName(): Promise<string | null> {
  const userId = await getVerifiedUserId();
  if (!userId) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .neq("id", userId)
    .limit(1)
    .maybeSingle<{ id: string; display_name: string }>();
  return data?.display_name?.trim() || null;
}

// updateMyProfile — spec סעיף 13.2. actor בלבד; profile נוצרת/מתעדכנת
// אחרי Auth, לעולם לא ממשתמש שרירותי מהטופס.
export async function updateMyProfile(
  displayName: string,
): Promise<Result<{ id: string; displayName: string }>> {
  const requestId = crypto.randomUUID();

  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", requestId);

  const trimmed = displayName.trim();
  if (trimmed.length < 1 || trimmed.length > 60) {
    return fail("INVALID_INPUT", "שם תצוגה חייב להיות בין 1 ל-60 תווים", requestId, {
      displayName: ["אורך לא תקין"],
    });
  }

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("update_my_profile", {
    p_actor: userId,
    p_display_name: trimmed,
  });
  if (error || !data) {
    return fail("UNEXPECTED", "שמירת השם נכשלה, נסו שוב", requestId);
  }

  return ok({ id: data.id as string, displayName: data.display_name as string }, requestId);
}
