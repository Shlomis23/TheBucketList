// מפתחות האימות הציבוריים של Supabase נשמרים בתוך הבנייה (27.9, מהירות).
//
// למה: getClaims מאמת את הטוקן מול המפתח הציבורי (JWKS). בלי עותק מקומי,
// כל מופע שרת חדש ב-Vercel מוריד אותו קודם (~285ms בממוצע, ~380 פעמים ביום
// לפי יומני Supabase) — וזה נופל בדיוק על הדף שהמשתמש מחכה לו.
// כאן: בזמן הבנייה ב-Vercel מורידים אותו פעם אחת ל-lib/supabase/jwks.json.
//
// בטוח: אלה מפתחות ציבוריים בלבד (בודקים שאין בהם חלק פרטי). אם המפתח
// יוחלף (rotation) — getClaims לא ימצא את ה-kid ברשימה ויוריד אותו כרגיל.
// כל כישלון כאן לא עוצר את הבנייה: נשארים עם רשימה ריקה = ההתנהגות הקודמת.
// מקומית (בלי VERCEL) לא נוגעים בקובץ, כדי שה-repo יישאר נקי.
import { writeFileSync } from "node:fs";

const OUT = new URL("../lib/supabase/jwks.json", import.meta.url);
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!process.env.VERCEL) {
  console.log("[jwks] לא ב-Vercel — מדלגים (נשאר הקובץ הקיים)");
  process.exit(0);
}

try {
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL חסר");
  const res = await fetch(`${base}/auth/v1/.well-known/jwks.json`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const keys = Array.isArray(body?.keys) ? body.keys : [];
  const safe = keys.filter(
    (k) => k && typeof k.kid === "string" && typeof k.kty === "string" && !("d" in k) && !("p" in k) && !("k" in k),
  );
  writeFileSync(OUT, `${JSON.stringify({ keys: safe }, null, 2)}\n`);
  console.log(`[jwks] נשמרו ${safe.length} מפתחות ציבוריים (${safe.map((k) => k.kid.slice(0, 8)).join(", ")})`);
} catch (e) {
  console.warn(`[jwks] לא הצלחנו להוריד — ממשיכים בלי (${e instanceof Error ? e.message : e})`);
}
