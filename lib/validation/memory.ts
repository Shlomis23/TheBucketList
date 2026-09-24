import { z } from "zod";

// זיכרון — spec סעיף 6.1: תאריך ביצוע חובה (date), טקסט עד 5,000.
// אלה בדיקות UX; האכיפה האמיתית ב-CHECK constraints וב-update_memory (0016).
export const MEMORY_STORY_MAX = 5000;

export const updateMemorySchema = z.object({
  memoryId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  happenedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  story: z.string().max(MEMORY_STORY_MAX, `עד ${MEMORY_STORY_MAX.toLocaleString("he-IL")} תווים`).default(""),
});

export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;

// "שבת, 20 בספטמבר" (withYear=false) / "שבת, 20 בספטמבר 2026".
// happened_on הוא date טהור (בלי שעה) — מפרשים אותו כצהריים UTC ומפרמטים
// ב-UTC, כדי שאזור זמן של השרת/הדפדפן לא יזיז אותו ליום הקודם.
export function formatMemoryDate(happenedOn: string, withYear = true): string {
  const d = new Date(`${happenedOn}T12:00:00Z`);
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(d);
}

// כותרת קבוצה בציר הזמן: "ספטמבר 2026".
export function formatMemoryMonth(happenedOn: string): string {
  const d = new Date(`${happenedOn}T12:00:00Z`);
  return new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", month: "long", year: "numeric" }).format(d);
}
