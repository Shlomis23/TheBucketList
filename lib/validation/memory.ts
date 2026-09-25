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

// ---------------------------------------------------------------------------
// חיפוש בזיכרונות (26.9). נעשה בדפדפן: כל הזיכרונות כבר בדף, ובקנה מידה של
// זוג אחד זה מיידי — בלי קפיצת רשת לכל אות. מחפשים בכותרת, בסיפור, במקום,
// בקטגוריה ובחודש ("אוגוסט", "2026"). כל מילה בחיפוש צריכה להופיע איפשהו.
// ---------------------------------------------------------------------------
export const MEMORY_SEARCH_MAX = 100;

// "טיול" = "טִיּוּל" = "טיול," ; אותיות סופיות = רגילות ("שלומ" מוצא "שלום").
const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
export function normalizeSearchText(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "") // ניקוד וטעמים
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/["'׳״`]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export type SearchableMemory = {
  title: string;
  story: string;
  place: string | null;
  happenedOn: string;
  categoryLabel: string | null;
};

export function memoryMatches(m: SearchableMemory, query: string): boolean {
  const words = normalizeSearchText(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeSearchText(
    [m.title, m.story, m.place ?? "", m.categoryLabel ?? "", formatMemoryMonth(m.happenedOn)].join(" "),
  );
  return words.every((w) => haystack.includes(w));
}
