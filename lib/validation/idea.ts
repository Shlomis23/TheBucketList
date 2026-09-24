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
