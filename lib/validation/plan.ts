import { z } from "zod";

// גבולות שדה תוכנית — spec סעיף 6.1. אלה בדיקות UX; האכיפה האמיתית היא
// ה-CHECK constraints והבדיקות ב-supabase/migrations/0009_plan_rpcs.sql.
export const DEFAULT_PLAN_TIMEZONE = "Asia/Jerusalem";

// starts_at/ends_at מגיעים מהטופס כ-ISO מלא (הלקוח ממיר מ-datetime-local
// עם new Date(...).toISOString() לפני השליחה) — ראו PlanScheduleFields.
const isoDateTime = z.string().datetime();

export const createPlanSchema = z.object({
  requestId: z.string().uuid(),
  ideaId: z.string().uuid(),
  startsAt: isoDateTime.optional(),
  endsAt: isoDateTime.optional(),
  timezone: z.string().trim().min(1).max(100).default(DEFAULT_PLAN_TIMEZONE),
  meetingPlace: z.string().trim().max(200).optional(),
  notes: z.string().max(3000).default(""),
  budgetMinor: z.number().int().min(0).max(100_000_000).optional(),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
  startsAt: isoDateTime.optional(),
  endsAt: isoDateTime.optional(),
  timezone: z.string().trim().min(1).max(100).default(DEFAULT_PLAN_TIMEZONE),
  meetingPlace: z.string().trim().max(200).optional(),
  notes: z.string().max(3000).default(""),
  budgetMinor: z.number().int().min(0).max(100_000_000).optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export const planIdVersionSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
});
export type PlanIdVersionInput = z.infer<typeof planIdVersionSchema>;

export const completePlanSchema = z.object({
  requestId: z.string().uuid(),
  id: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
  happenedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  story: z.string().max(5000).default(""),
  // "להעביר את הרעיון לארכיון?" בסיום תוכנית — best-effort, לא חלק
  // מהטרנזקציה של complete_plan עצמה (ראו completePlanAction). ה-ideaId
  // וגרסתו הנוכחית נשלפים בשרת מתוך ה-plan עצמו, לא מהלקוח.
  archiveIdea: z.boolean().default(false),
});
export type CompletePlanInput = z.infer<typeof completePlanSchema>;

// עלות באגורות -> תצוגת ₪, זהה ל-formatCostMinor באידאות (idea.ts) — תקציב
// תוכנית ורעיון חולקים את אותה סמנטיקה (0=חינם, null=לא ידוע).
export function formatBudgetMinor(budgetMinor: number | null): string | null {
  if (budgetMinor === null) return null;
  if (budgetMinor === 0) return "חינם";
  const shekels = budgetMinor / 100;
  const hasFraction = budgetMinor % 100 !== 0;
  return `₪${shekels.toLocaleString("he-IL", {
    maximumFractionDigits: hasFraction ? 2 : 0,
  })}`;
}

export function formatPlanWhen(startsAt: string | null): string {
  if (!startsAt) return "מועד לא נקבע עדיין";
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: DEFAULT_PLAN_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));
}

// "המועד עבר" (25.9): תוכנית שעוד מוצעת אבל הזמן שלה כבר מאחורינו —
// מבקשים לסגור אותה כזיכרון (או לדחות/לבטל) במקום שתישאר תלויה לנצח.
// עם שעת סיום: אחרי הסיום. בלי שעת סיום: 3 שעות אחרי ההתחלה (באמצע ערב
// בחוץ לא נשאל "איך היה?"). בלי מועד בכלל — אף פעם לא "עבר".
const PAST_GRACE_MS = 3 * 60 * 60 * 1000;

export function isPlanPast(startsAt: string | null, endsAt: string | null, now = Date.now()): boolean {
  if (endsAt) return new Date(endsAt).getTime() < now;
  if (startsAt) return new Date(startsAt).getTime() + PAST_GRACE_MS < now;
  return false;
}

// "היום" / "אתמול" / "ביום שלישי" (עד שבוע) / "לפני 12 ימים" — לפי שעון ישראל.
export function pastWhenLabel(startsAt: string | null, now = new Date()): string {
  if (!startsAt) return "";
  const dayKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_PLAN_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const days = Math.round((Date.parse(dayKey(now)) - Date.parse(dayKey(new Date(startsAt)))) / 86_400_000);
  if (days <= 0) return "היום";
  if (days === 1) return "אתמול";
  if (days < 7) {
    const weekday = new Intl.DateTimeFormat("he-IL", { timeZone: DEFAULT_PLAN_TIMEZONE, weekday: "long" }).format(new Date(startsAt));
    return `ב${weekday}`;
  }
  return `לפני ${days} ימים`;
}

// כרטיס "התוכנית הקרובה" בבית (25.9): "היום, 19:00" / "מחר, 19:00", ומעבר לזה
// תמיד עם תאריך — "יום שלישי" לבד נקרא כמו "השלישי הקרוב" גם כשזה בעוד שבועות.
export function upcomingWhenLabel(startsAt: string | null, now = new Date()): string {
  if (!startsAt) return formatPlanWhen(null);
  const dayKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_PLAN_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const days = Math.round((Date.parse(dayKey(new Date(startsAt))) - Date.parse(dayKey(now))) / 86_400_000);
  if (days === 0 || days === 1) {
    const time = new Intl.DateTimeFormat("he-IL", { timeZone: DEFAULT_PLAN_TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(startsAt));
    return `${days === 0 ? "היום" : "מחר"}, ${time}`;
  }
  return formatPlanWhen(startsAt);
}
