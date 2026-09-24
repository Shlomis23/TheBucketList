import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { setInviteCookie } from "@/lib/invitations/cookie";
import { inviteTokenSchema } from "@/lib/validation/invitation";

// POST /api/invitations/exchange — spec סעיף 11.2, 13.2.
// מקבל token מה-fragment (נשלח מהלקוח אחרי ניקוי מה-URL עם history.replaceState,
// ראו app/invite/InviteConsent.tsx), ולא קובע חברות ולא נוגע בטבלת ההזמנות
// בכלל — רק בודק אורך/קידוד, מגביל קצב, ושומר cookie זמני חתום/מוצפן/HttpOnly
// עם ה-hash של הטוקן. אימות ההזמנה עצמה (קיימת/פגה/מייל תואם) קורה מאוחר
// יותר, אחרי התחברות, בתוך acceptInvitation -> accept_invitation_internal.
// אין רישום token גולמי ב-logs — רק hash, ורק בזיכרון הבקשה הזו.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INPUT", message: "בקשה לא תקינה" } },
      { status: 400 },
    );
  }

  const parsed = inviteTokenSchema.safeParse((body as { token?: unknown })?.token);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INPUT", message: "קישור ההזמנה לא תקין" } },
      { status: 400 },
    );
  }

  // 20 בדיקות/15 דק'/IP — DB-backed (public.check_rate_limit), לא זיכרון
  // תהליך בודד (spec סעיף 11.2: "אין הסתמכות על זיכרון תהליך בודד").
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

  const service = createSupabaseServiceClient();
  const { data: allowed, error: rateLimitError } = await service.rpc("check_rate_limit", {
    p_key: `invite_exchange:${ip}`,
    p_max: 20,
    p_window_seconds: 900,
  });

  if (rateLimitError) {
    return NextResponse.json(
      { ok: false, error: { code: "UNEXPECTED", message: "משהו השתבש, נסו שוב" } },
      { status: 500 },
    );
  }
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "RATE_LIMITED", message: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." } },
      { status: 429 },
    );
  }

  const tokenHash = createHash("sha256").update(parsed.data).digest("hex");
  await setInviteCookie(tokenHash);

  return NextResponse.json({ ok: true });
}
