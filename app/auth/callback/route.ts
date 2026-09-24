import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { peekInviteCookie } from "@/lib/invitations/cookie";

// callback `/auth/callback` — spec סעיף 5 (F2), 6, 10.3.
// מנתב פנימית בלבד — אין קריאת `next` חיצוני מהלקוח, כך שאין open redirect
// אפשרי מהנתיב הזה מלכתחילה.
//
// אם יש cookie הזמנה זמני תקף (מ-/invite -> /api/invitations/exchange,
// אותו דומיין, SameSite=Lax -> שורד ניווט top-level מקישור המייל) -> ממשיכים
// ל-/invite/continue להשלמת ההצטרפות, לא ל-/onboarding שהיה יוצר מרחב חדש
// בלי קשר להזמנה ("לאחר auth/callback, cookie תקף מאפשר להמשיך ישר לקבלה;
// חסר/פג -> יש לפתוח שוב את קישור ההזמנה").
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const invite = await peekInviteCookie();
      return NextResponse.redirect(`${origin}${invite ? "/invite/continue" : "/onboarding"}`);
    }
  }

  // קישור לא תקין/פג/נוצל: הודעה אחידה, לא לחשוף פרטים.
  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
