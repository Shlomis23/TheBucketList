import "server-only";

import { cache } from "react";
import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";
import { purgeSpaceNow } from "@/lib/purge";

// סגירת מרחב ומחיקת חשבון — F8. החלטות שלומי (25.9) ופירוט ב-0020/0021:
// סגירה חד-צדדית, 14 יום חרטה (רק הסוגר מבטל), ZIP לשני הצדדים, ומחיקת
// חשבון = סגירה + מחיקת החשבון בסוף החרטה (או מיד, אם לבד במרחב).

export type SpaceState = {
  spaceId: string;
  status: "open" | "closed";
  closedAt: string | null;
  purgeAfter: string | null;
  closedByMe: boolean;
  closedByName: string | null;
  memberCount: number;
  deletionRequested: boolean;
};

// null = אין מרחב בכלל (לפני יצירה, או אחרי שמרחב נמחק).
export const getMySpaceState = cache(async (): Promise<SpaceState | null> => {
  const userId = await getVerifiedUserId();
  if (!userId) return null;
  const service = createSupabaseServiceClient();
  const { data } = await service.rpc("get_my_space_state", { p_actor: userId });
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    spaceId: row.space_id,
    status: row.status,
    closedAt: row.closed_at,
    purgeAfter: row.purge_after,
    closedByMe: row.closed_by_me,
    closedByName: row.closed_by_name?.trim() || null,
    memberCount: row.member_count,
    deletionRequested: Boolean(row.deletion_requested),
  };
});

export async function closeSpace(): Promise<Result<{ purgeAfter: string }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("close_space", { p_actor: userId, p_delete_account: false, p_grace_days: 14 });
  if (error || !data) {
    if (error?.message?.includes("VERSION_CONFLICT")) return fail("VERSION_CONFLICT", "המרחב כבר נסגר", traceId);
    if (error?.message?.includes("NOT_MEMBER")) return fail("NOT_FOUND", "לא נמצא מרחב לסגור", traceId);
    return fail("UNEXPECTED", "הסגירה נכשלה, נסו שוב", traceId);
  }
  return ok({ purgeAfter: (data as { purge_after: string }).purge_after }, traceId);
}

export async function reopenSpace(): Promise<Result<{ reopened: true }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { error } = await service.rpc("reopen_space", { p_actor: userId });
  if (error) {
    if (error.message?.includes("NOT_AUTHOR")) return fail("NOT_FOUND", "רק מי שסגר את המרחב יכול לבטל את הסגירה", traceId);
    if (error.message?.includes("VERSION_CONFLICT")) return fail("VERSION_CONFLICT", "תקופת החרטה הסתיימה", traceId);
    return fail("UNEXPECTED", "ביטול הסגירה נכשל, נסו שוב", traceId);
  }
  return ok({ reopened: true }, traceId);
}

// אימות מחדש לפני מחיקת חשבון: קוד חדש למייל של המשתמש המחובר עצמו
// (לא מהטופס — אי אפשר לשלוח קוד לכתובת אחרת).
export async function sendReauthCode(): Promise<Result<{ sent: true; maskedEmail: string }>> {
  const traceId = crypto.randomUUID();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) {
    if (error.status === 429) return fail("RATE_LIMITED", "נשלח קוד ממש עכשיו. חכו דקה ונסו שוב.", traceId);
    return fail("UNEXPECTED", "שליחת הקוד נכשלה, נסו שוב", traceId);
  }
  const [name, domain] = email.split("@");
  return ok({ sent: true, maskedEmail: `${name.slice(0, 2)}•••@${domain}` }, traceId);
}

export type DeleteAccountOutcome = "deleted_now" | "scheduled";

// מחיקת חשבון, אחרי קוד תקף:
//   - אין מרחב        -> מחיקה מיידית.
//   - לבד במרחב פתוח -> סגירה + מחיקת הכול מיד.
//   - יש בן/בת זוג, מרחב פתוח -> סגירה ל-14 יום + סימון החשבון למחיקה.
//   - מרחב כבר סגור (ע"י בן/בת הזוג) -> סימון החשבון למחיקה יחד עם המרחב.
export async function deleteAccount(code: string): Promise<Result<{ outcome: DeleteAccountOutcome }>> {
  const traceId = crypto.randomUUID();
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    email: user.email,
    token: code,
    type: "email",
  });
  if (verifyError || verified.user?.id !== user.id) {
    return fail(
      "INVALID_INPUT",
      verifyError?.status === 429 ? "יותר מדי ניסיונות. חכו דקה ונסו שוב." : "הקוד שגוי או שפג תוקפו",
      traceId,
    );
  }

  const userId = user.id;
  const service = createSupabaseServiceClient();
  const state = await getMySpaceState();

  if (!state) {
    const { error } = await service.rpc("prepare_account_deletion_without_space", { p_actor: userId });
    if (error) return fail("UNEXPECTED", "המחיקה נכשלה, נסו שוב", traceId);
    const { error: authError } = await service.auth.admin.deleteUser(userId);
    if (authError) return fail("UNEXPECTED", "המחיקה נכשלה, נסו שוב", traceId);
    return ok({ outcome: "deleted_now" }, traceId);
  }

  if (state.status === "closed") {
    const { error } = await service.rpc("request_account_deletion", { p_actor: userId });
    if (error) return fail("UNEXPECTED", "הבקשה נכשלה, נסו שוב", traceId);
    return ok({ outcome: "scheduled" }, traceId);
  }

  const alone = state.memberCount <= 1;
  const { error: closeError } = await service.rpc("close_space", {
    p_actor: userId,
    p_delete_account: true,
    p_grace_days: alone ? 0 : 14,
  });
  if (closeError) return fail("UNEXPECTED", "המחיקה נכשלה, נסו שוב", traceId);

  if (!alone) return ok({ outcome: "scheduled" }, traceId);

  // לבד: אין מי שהמידע שלו נמחק איתו — מוחקים עכשיו. אם משהו נכשל באמצע,
  // המרחב כבר סגור עם purge_after=now, והמשימה היומית תשלים את המחיקה.
  const purged = await purgeSpaceNow(state.spaceId);
  if (!purged) return fail("UNEXPECTED", "החשבון נסגר, והמחיקה תושלם אוטומטית תוך יממה", traceId);
  return ok({ outcome: "deleted_now" }, traceId);
}
