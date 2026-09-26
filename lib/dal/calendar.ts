import "server-only";

import { getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { fail, ok, type Result } from "@/lib/errors/result";

// הטוקן של היומן במינוי (0037) — נוצר בפעם הראשונה שמבקשים, קבוע אחר כך;
// rotate — טוקן חדש, והקישור הישן מפסיק לעבוד.
export async function getCalendarFeedToken(rotate = false): Promise<Result<{ token: string }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);
  const { data, error } = await createSupabaseServiceClient().rpc("calendar_feed_token", { p_actor: userId, p_rotate: rotate });
  if (error || typeof data !== "string") return fail("UNEXPECTED", "לא הצלחנו ליצור קישור ליומן, נסו שוב", traceId);
  return ok({ token: data }, traceId);
}

export type FeedPlanRow = {
  id: string;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  meeting_place: string | null;
  notes: string;
  updated_at: string;
};

// לנתיב /api/calendar/<token>.ics — בלי התחברות (אפליקציית היומן מושכת
// לבד); הטוקן הוא ההרשאה. null = טוקן לא קיים/אופס.
export async function getCalendarFeedPlans(token: string): Promise<FeedPlanRow[] | null> {
  const { data, error } = await createSupabaseServiceClient().rpc("calendar_feed_plans", { p_token: token });
  if (error) return null;
  return (data as FeedPlanRow[] | null) ?? [];
}
