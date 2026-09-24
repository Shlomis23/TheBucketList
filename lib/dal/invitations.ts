import "server-only";

import { randomBytes, createHash } from "crypto";
import { headers } from "next/headers";
import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";

export type InvitationStatus = "pending" | "accepted" | "revoked";

export type InvitationStatusDto = {
  id: string;
  maskedEmail: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
};

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function mapInvitationRpcError(errorMessage: string | undefined, fallback: string, traceId: string): Result<never> {
  if (errorMessage?.includes("RATE_LIMITED")) {
    return fail("RATE_LIMITED", "יותר מדי הזמנות בזמן קצר — נסו שוב בעוד שעה", traceId);
  }
  if (errorMessage?.includes("ALREADY_IN_SPACE")) {
    return fail("INVALID_INPUT", "אפשר להזמין רק כשאתם לבד במרחב", traceId);
  }
  if (errorMessage?.includes("INVALID_INPUT")) {
    return fail("INVALID_INPUT", "כתובת אימייל לא תקינה", traceId);
  }
  if (errorMessage?.includes("VERSION_CONFLICT")) {
    return fail("VERSION_CONFLICT", "ההזמנה כבר לא ממתינה", traceId);
  }
  if (errorMessage?.includes("NOT_FOUND")) {
    return fail("NOT_FOUND", "ההזמנה הזו כבר לא קיימת", traceId);
  }
  return fail("UNEXPECTED", fallback, traceId);
}

// createInvitation — RPC שירות (create_invitation, 0011/0012). הטוקן הגולמי
// נוצר כאן ב-CSPRNG (32 בייט, base64url), ה-hash בלבד עובר ל-DB; הטוקן
// הגולמי מוחזר פעם אחת בלבד לקורא (spec סעיף 10.3, 13.2) ולעולם לא נשמר.
export async function createInvitation(
  targetEmail: string,
): Promise<Result<{ id: string; link: string; expiresAt: string; maskedEmail: string }>> {
  const traceId = crypto.randomUUID();

  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("create_invitation", {
    p_actor: userId,
    p_target_email: targetEmail,
    p_token_hash: tokenHash,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return mapInvitationRpcError(error?.message, "יצירת ההזמנה נכשלה, נסו שוב", traceId);
  }

  const row = data[0] as { id: string; target_email: string; expires_at: string };
  const maskedEmail = `${row.target_email[0]}***@${row.target_email.split("@")[1]}`;

  // NEXT_PUBLIC_SITE_URL אינו קיים בפרויקט הזה בכוונה (ראו .env.example) —
  // מקור האמת לדומיין הוא הבקשה עצמה, לא ערך קבוע שיכול להתיישן בין
  // production/preview. הקריאה כאן מגיעה מ-Server Action, ל-headers() יש
  // גישה ל-host/x-forwarded-proto גם שם.
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";

  return ok(
    {
      id: row.id,
      link: `${origin}/invite#token=${rawToken}`,
      expiresAt: row.expires_at,
      maskedEmail,
    },
    traceId,
  );
}

// revokeInvitation — RPC שירות (revoke_invitation).
export async function revokeInvitation(invitationId: string): Promise<Result<{ revoked: true }>> {
  const traceId = crypto.randomUUID();

  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("revoke_invitation", {
    p_actor: userId,
    p_invitation_id: invitationId,
  });

  if (error || !data) {
    return mapInvitationRpcError(error?.message, "ביטול ההזמנה נכשל, נסו שוב", traceId);
  }
  return ok({ revoked: true }, traceId);
}

// getInvitationStatus — קריאה בלבד, RPC בטוחה (get_invitation_status, גרנטד
// ל-authenticated, auth.uid() פנימי). מוסך email; אף פעם לא token/hash.
export async function getInvitationStatus(): Promise<InvitationStatusDto | null> {
  const userId = await getVerifiedUserId();
  if (!userId) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("get_invitation_status");

  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const row = data[0] as {
    id: string;
    masked_email: string;
    status: InvitationStatus;
    expires_at: string;
    created_at: string;
  };
  return {
    id: row.id,
    maskedEmail: row.masked_email,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

// acceptInvitation — RPC שירות (accept_invitation_internal, 0003). actor
// מה-session המאומת; tokenHash מגיע מה-cookie הזמני (lib/invitations/cookie.ts),
// לעולם לא מטופס הלקוח (spec סעיף 10.3, 13.2).
export async function acceptInvitation(tokenHash: string): Promise<Result<{ spaceId: string }>> {
  const traceId = crypto.randomUUID();

  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("accept_invitation_internal", {
    p_actor: userId,
    p_token_hash: tokenHash,
  });

  if (error || !data) {
    if (error?.message?.includes("ALREADY_IN_SPACE")) {
      return fail("INVALID_INPUT", "כבר יש לכם מרחב פעיל — אי אפשר להצטרף למרחב נוסף", traceId);
    }
    // הודעה אחידה לכל שאר הכשלים (פגה/בוטלה/token אקראי/אימייל לא תואם) —
    // בלי לדלוף פרטי מרחב (spec סעיף 11.2, 14.2 סעיף 6).
    return fail(
      "NOT_FOUND",
      "ההזמנה הזו כבר לא זמינה. אפשר לבקש קישור חדש מבן/בת הזוג.",
      traceId,
    );
  }

  return ok({ spaceId: data as string }, traceId);
}
