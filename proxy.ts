import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// proxy.ts (Next 16 — לשעבר middleware.ts). רץ לפני כל בקשה לדף/פעולה.
//
// 1. רענון session — הבאג שניתק את שלומי (25.9): Server Components לא
//    יכולים לכתוב cookies (ראו setAll ב-lib/supabase/server.ts). בלי השלב
//    הזה, כשה-access token פג (כשעה) כל בקשה רועננה אותו בשרת אבל הטוקנים
//    החדשים לא הגיעו לדפדפן, הבקשה הבאה השתמשה שוב ב-refresh token הישן,
//    ו-Supabase זיהה "refresh_token_already_used" וביטל את ה-session.
//    כאן יש גישה ל-response, אז הטוקנים המרועננים נכתבים גם לבקשה (כדי
//    שה-Server Components באותה בקשה יראו אותם) וגם לתשובה (לדפדפן).
//    זה הדפוס הרשמי של @supabase/ssr ל-Next.js.
//
// 2. כתובת אחת: ב-production כל כתובת vercel.app אחרת של הפרויקט מפנה
//    לכתובת הקבועה. ה-cookies של ההתחברות שמורים לכל כתובת בנפרד — קיצור
//    במסך הבית לכתובת אחת + כניסה בכתובת אחרת = "מנותק" בלי סיבה נראית.

const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "the-bucket-list-seven.vercel.app";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (process.env.VERCEL_ENV === "production" && host && host !== CANONICAL_HOST) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    // 308 שומר method/body — לא משנה POST של Server Action ל-GET.
    return NextResponse.redirect(url, 308);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          // Cache-Control: no-store וכו' — תשובה שכותבת טוקן לא נשמרת ב-CDN.
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    },
  );

  // חובה בדיוק כאן, בלי קוד ביניים: getClaims מאמת את ה-JWT ומרענן אותו
  // אם פג — וזה מה שמפעיל את setAll למעלה. לא מחליטים כאן הרשאות: כל דף
  // עדיין עושה getVerifiedUserId + RLS בעצמו (spec 9.1).
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  // לא על קבצים סטטיים/תמונות/אייקונים/manifest — אין בהם session, וכל
  // בקשה מיותרת כאן היא עוד קריאה ל-Auth. וגם לא על /api/cron/: Vercel
  // קורא לו בכתובת הפריסה, והפניה לכתובת הקבועה הייתה מאבדת את הסוד.
  matcher: [
    "/((?!api/cron/|_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon\\.png|manifest\\.webmanifest|icons/|images/|offline-assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
