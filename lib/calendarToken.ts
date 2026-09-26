import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

// קישור חתום לקובץ היומן של תוכנית (26.9). באייפון, קובץ .ics נפתח בחלון
// Safari נפרד — בלי העוגיות של האפליקציה המותקנת, כלומר בלי התחברות. לכן
// הקישור נחתם בשרת בזמן שחבר במרחב צופה בתוכנית (דף התוכנית בודק הרשאה
// ב-RLS), ותקף 24 שעות. בלי חתימה תקפה — הנתיב דורש התחברות רגילה.
// המפתח: CRON_SECRET (סוד שרת קיים), עם קידומת ייעודית כדי להפריד שימושים.
const TTL_MS = 24 * 60 * 60 * 1000;

function sign(planId: string, exp: number, secret: string) {
  return createHmac("sha256", secret).update(`bucket-calendar:v1:${planId}:${exp}`).digest("base64url");
}

export function calendarPath(planId: string, now = Date.now()): string {
  const secret = process.env.CRON_SECRET;
  const base = `/api/plans/${planId}/calendar`;
  if (!secret) return base;
  const exp = now + TTL_MS;
  return `${base}?exp=${exp}&sig=${sign(planId, exp, secret)}`;
}

export function verifyCalendarToken(planId: string, exp: string | null, sig: string | null, now = Date.now()): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < now) return false;
  const expected = Buffer.from(sign(planId, expNum, secret));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
