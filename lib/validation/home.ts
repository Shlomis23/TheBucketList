// מסך הבית — כרטיס עליון אחד (26.9, אפשרות א). הדבר הכי חשוב עכשיו עולה
// לכרטיס הגדול, וכל השאר יורד ל"עוד בשבילך". סדר העדיפויות (אושר ע"י שלומי):
//   1. תוכנית היום   2. "איך היה?"   3. רעיון חדש של בן/בת הזוג שמחכה לי
//   4. הודעה חדשה    5. התוכנית הקרובה   6. אין כלום — "מה עושים היום?"
// מאצ' בלי תוכנית בכוונה לא כאן ("זה מלחיץ" — יהיו הרבה, זה בנק רעיונות).
// פונקציות טהורות (לבדיקות); היום לפי שעון ישראל.

export type HeroKind = "plan_today" | "how_was" | "partner_idea" | "unread" | "upcoming" | "idle";

const TZ = "Asia/Jerusalem";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const DAY_MS = 86_400_000;

export function daysFromToday(iso: string, now = new Date()): number {
  return Math.round((Date.parse(dayKey(new Date(iso))) - Date.parse(dayKey(now))) / DAY_MS);
}

export function pickHeroKind(
  input: {
    upcomingPlan: { startsAt: string | null } | null;
    pastPlansCount: number;
    partnerNewIdeasCount: number;
    unreadCount: number;
  },
  now = new Date(),
): HeroKind {
  const p = input.upcomingPlan;
  if (p?.startsAt && daysFromToday(p.startsAt, now) <= 0) return "plan_today";
  if (input.pastPlansCount > 0) return "how_was";
  if (input.partnerNewIdeasCount > 0) return "partner_idea";
  if (input.unreadCount > 0) return "unread";
  if (p) return "upcoming";
  return "idle";
}

// תגית בכרטיס של תוכנית היום: "עכשיו" (כבר התחילה), "הערב" (מ-17:00), "היום".
export function planTodayKicker(startsAt: string, now = new Date()): string {
  if (new Date(startsAt).getTime() <= now.getTime()) return "עכשיו";
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date(startsAt)));
  return hour >= 17 ? "הערב" : "היום";
}

// תגית לתוכנית קרובה: "מחר" / "בעוד 3 ימים" / "בעוד שבוע" / "בעוד 12 ימים".
export function daysUntilLabel(startsAt: string | null, now = new Date()): string {
  if (!startsAt) return "התוכנית הקרובה";
  const d = daysFromToday(startsAt, now);
  if (d <= 0) return "היום";
  if (d === 1) return "מחר";
  if (d === 2) return "מחרתיים";
  if (d === 7) return "בעוד שבוע";
  return `בעוד ${d} ימים`;
}
