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

export function formatDurationMinutes(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes < 60) return `${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} שע׳` : `${hours} שע׳ ${rest} דק׳`;
}
