import "server-only";

import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";

// getMySpaceId — קריאה בלבד, דרך client עם JWT המשתמש ו-RLS (member_read).
// אין צורך ב-service role לקריאה הזו.
export async function getMySpaceId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("space_members")
    .select("space_id")
    .limit(1)
    .maybeSingle();
  return (data?.space_id as string | undefined) ?? null;
}

// hasPartner — קריאה בלבד. משמש ב-/settings כדי להחליט אם להציג הזמנה
// (רק חבר יחיד) או "שם בן/בת הזוג" (כבר שני חברים) — spec סעיף 11.1.
export async function hasPartner(spaceId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("space_members")
    .select("user_id", { count: "exact", head: true })
    .eq("space_id", spaceId);
  return (count ?? 0) >= 2;
}

// createSpace — spec סעיף 5 (F1), 13.2. requestId מגיע מהלקוח (נשמר לאורך
// כל ניסיונות ה-retry של אותה שליחה) כדי ש-create_space תהיה idempotent.
export async function createSpace(params: {
  requestId: string;
  timezone: string;
}): Promise<Result<{ spaceId: string }>> {
  const traceId = crypto.randomUUID();

  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);
  if (!params.requestId) return fail("INVALID_INPUT", "בקשה לא תקינה", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("create_space", {
    p_actor: userId,
    p_request_id: params.requestId,
    p_timezone: params.timezone,
  });

  if (error) {
    if (error.message?.includes("ALREADY_IN_SPACE")) {
      return fail("INVALID_INPUT", "כבר יש לכם מרחב פעיל", traceId);
    }
    if (error.message?.includes("VERSION_CONFLICT")) {
      return fail("VERSION_CONFLICT", "הבקשה הזו כבר נשלחה עם נתונים אחרים", traceId);
    }
    return fail("UNEXPECTED", "יצירת המרחב נכשלה, נסו שוב", traceId);
  }

  return ok({ spaceId: data as string }, traceId);
}
