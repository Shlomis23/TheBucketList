import "server-only";

import { getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";

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
