import "server-only";

// Supabase client עבור שרת בלבד (Server Components / Server Actions / Route Handlers).
// אין להשתמש בקובץ הזה מרכיב לקוח — "server-only" יזרוק שגיאת build אם ינסו.
// ראו docs/The-Bucket-List-Technical-Spec-HE.md סעיפים 9.1, 13.4.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // נקרא מתוך Server Component ללא הרשאת כתיבה על cookies.
            // תקין רק כי proxy.ts מרענן את ה-session לפני כל בקשה וכותב את
            // הטוקנים החדשים לדפדפן — בלעדיו הרענון כאן היה הולך לאיבוד.
          }
        },
      },
    },
  );
}

/**
 * מחזיר את ה-actor המאומת מה-session, או null אם אין session תקף.
 * זהו המקור היחיד ל-userId בכל Server Action / RPC — אסור לקבל
 * userId/createdBy מהטופס של הלקוח (סעיף 10.1, 13.4).
 */
//
// עטוף ב-cache() של React: תוצאה אחת לכל בקשת שרת. כמה DAL-ים באותו רינדור
// (למשל settings: הדף + getMyProfile) לא יבצעו כל אחד אימות נפרד.
// ה-cache לא חוצה בקשות/משתמשים — הוא מתאפס בכל בקשה.
//
// getClaims ולא getUser (26.9, שיפור מהירות — באישור שלומי): הפרויקט חותם
// טוקנים ב-ES256, כך ש-getClaims מאמת את החתימה והתוקף כאן בשרת מול המפתח
// הציבורי (JWKS, נשמר בזיכרון התהליך 10 דקות) — בלי קריאת רשת ל-Auth בכל
// דף ובכל תמונה (~165ms בממוצע לפי יומני Supabase). אי אפשר לזייף טוקן.
// המחיר: session שבוטל בשרת (התנתקות מכל המכשירים) ממשיך לעבוד עד שהטוקן
// פג (עד שעה). מחיקת חשבון עדיין בודקת מול Auth (lib/dal/account.ts).
// אם הפרויקט יחזור לחתימה סימטרית, getClaims נופל אוטומטית ל-getUser.
export const getVerifiedUserId = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const { sub, role } = data.claims;
  if (typeof sub !== "string" || role !== "authenticated") return null;
  return sub;
});
