import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// callback `/auth/callback` — spec סעיף 5 (F2), 6.
// מנתב פנימית בלבד — אין קריאת `next` חיצוני מהלקוח, כך שאין open redirect
// אפשרי מהנתיב הזה מלכתחילה.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // קישור לא תקין/פג/נוצל: הודעה אחידה, לא לחשוף פרטים.
  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
