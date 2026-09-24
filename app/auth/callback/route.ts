import { NextResponse, type NextRequest } from "next/server";

// callback `/auth/callback` — spec סעיף 5 (F2), 6.
// TODO: להחליף code/token_hash ב-session אמיתי דרך Supabase Auth,
// ואז לנתב פנימית בלבד. `next` חיצוני חייב להידחות — לעולם לא open redirect.
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);

  // TODO: exchangeCodeForSession + בדיקת next פנימי בלבד לפני redirect.
  return NextResponse.redirect(`${origin}/onboarding`);
}
