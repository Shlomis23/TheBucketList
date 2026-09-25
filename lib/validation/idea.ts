import { z } from "zod";

// גבולות שדה רעיון — spec סעיף 6.1. אלה בדיקות UX; האכיפה האמיתית
// היא ה-CHECK constraints ב-supabase/migrations (אין לסמוך על הלקוח לבד).
export const ideaCategories = [
  "food",
  "outdoors",
  "culture",
  "trip",
  "home",
  "learning",
  "other",
] as const;

// Google place_id (0019) — רק תווים שמופיעים במזהים של Google. נשלח רק
// כשהמקום נבחר מההשלמה; טקסט חופשי = בלי place_id.
export const placeIdSchema = z
  .string()
  .max(300)
  .regex(/^[A-Za-z0-9_-]+$/)
  .optional();

export const createIdeaSchema = z.object({
  requestId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "כותרת היא שדה חובה")
    .max(120, "כותרת עד 120 תווים"),
  description: z.string().max(3000).default(""),
  category: z.enum(ideaCategories).default("other"),
  locationText: z.string().max(200).optional(),
  placeId: placeIdSchema,
  // "גם אני רוצה את זה" (0025) — מסומן מראש בטופס; false = "זה בשבילך".
  selfYes: z.boolean().default(false),
  sourceUrl: z
    .string()
    .max(2048)
    .regex(/^https:\/\//, "קישור חייב להתחיל ב-https")
    .optional(),
  // אגורות; 0 = חינם, undefined/NULL = לא ידוע. אין הנחה שהמחיר לאדם אחד.
  costMinor: z.number().int().min(0).max(100_000_000).optional(),
  durationMinutes: z.number().int().min(1).max(525_600).optional(),
});

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;

export type IdeaCategory = (typeof ideaCategories)[number];

export type ReactionPreference = "yes" | "maybe" | "no";

export const reactionLabels: Record<ReactionPreference, string> = {
  yes: "כן",
  maybe: "אולי",
  no: "לא",
};

export const reactionBadgeClass: Record<ReactionPreference, string> = {
  yes: "badge-green",
  maybe: "badge-yellow",
  no: "badge-pink",
};

// עריכת רעיון קיים — אותם גבולות שדה כמו createIdeaSchema, בתוספת
// ideaId + expectedVersion (concurrency, ראו update_idea ב-0015).
export const updateIdeaSchema = z.object({
  ideaId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  title: z
    .string()
    .trim()
    .min(1, "כותרת היא שדה חובה")
    .max(120, "כותרת עד 120 תווים"),
  description: z.string().max(3000).default(""),
  category: z.enum(ideaCategories).default("other"),
  locationText: z.string().max(200).optional(),
  placeId: placeIdSchema,
  sourceUrl: z
    .string()
    .max(2048)
    .regex(/^https:\/\//, "קישור חייב להתחיל ב-https")
    .optional(),
  costMinor: z.number().int().min(0).max(100_000_000).optional(),
  durationMinutes: z.number().int().min(1).max(525_600).optional(),
});

export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;

export const categoryLabels: Record<IdeaCategory, string> = {
  food: "אוכל",
  outdoors: "טבע וחוץ",
  culture: "תרבות",
  trip: "טיול",
  home: "בית",
  learning: "למידה",
  other: "אחר",
};

// עלות באגורות -> תצוגת ₪. null = לא ידוע (שונה מ-0 = חינם).
export function formatCostMinor(costMinor: number | null): string | null {
  if (costMinor === null) return null;
  if (costMinor === 0) return "חינם";
  const shekels = costMinor / 100;
  const hasFraction = costMinor % 100 !== 0;
  return `₪${shekels.toLocaleString("he-IL", {
    maximumFractionDigits: hasFraction ? 2 : 0,
  })}`;
}

// משך — נבחר מרשימה (25.9, במקום הקלדת דקות חופשית). ב-DB עדיין נשמרות
// דקות (duration_minutes), אז אין שינוי סכמה ורעיונות קיימים לא נשברים.
export const durationPresets: { minutes: number; label: string }[] = [
  { minutes: 30, label: "חצי שעה" },
  { minutes: 60, label: "שעה" },
  { minutes: 90, label: "שעה וחצי" },
  { minutes: 120, label: "שעתיים" },
  { minutes: 180, label: "3 שעות" },
  { minutes: 300, label: "חצי יום" },
  { minutes: 480, label: "יום שלם" },
  { minutes: 2880, label: "יומיים" },
  { minutes: 4320, label: "כמה ימים" },
  { minutes: 10080, label: "שבוע ומעלה" },
];

// "משך עד" במסך מה עושים — תקרות, לא ערכים מדויקים.
export const maxDurationPresets: { minutes: number; label: string }[] = [
  { minutes: 60, label: "עד שעה" },
  { minutes: 180, label: "עד 3 שעות" },
  { minutes: 300, label: "עד חצי יום" },
  { minutes: 480, label: "עד יום שלם" },
  { minutes: 2880, label: "עד יומיים" },
];

// תצוגה: שם מהרשימה כשיש התאמה מדויקת; אחרת ניסוח כללי (לרעיונות ישנים
// שהוזנו בדקות חופשיות — למשל 150 -> "2.5 שעות").
export function formatDurationMinutes(minutes: number | null): string | null {
  if (minutes === null) return null;
  const preset = durationPresets.find((p) => p.minutes === minutes);
  if (preset) return preset.label;
  if (minutes < 60) return `${minutes} דק׳`;
  if (minutes < 1440) {
    const hours = Math.round((minutes / 60) * 2) / 2; // לחצי שעה הקרובה
    return hours === 1 ? "שעה" : `${hours.toLocaleString("he-IL")} שעות`;
  }
  const days = Math.round(minutes / 1440);
  return days === 1 ? "יום" : `${days} ימים`;
}

// אפשרויות לרשימה בטופס: אם לרעיון קיים יש ערך שלא ברשימה, הוא מופיע
// כאפשרות נוספת כדי שעריכה לא תמחק אותו בשקט.
export function durationOptionsFor(current: number | null): { minutes: number; label: string }[] {
  if (current === null || durationPresets.some((p) => p.minutes === current)) return durationPresets;
  return [...durationPresets, { minutes: current, label: `${formatDurationMinutes(current)} (הערך הנוכחי)` }].sort(
    (a, b) => a.minutes - b.minutes,
  );
}
