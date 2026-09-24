import { z } from "zod";
import { ideaCategories } from "@/lib/validation/idea";

// קלט chooseExperience — spec סעיף 8.1. excludedIdeaIds עד 50 (מדלג על
// מועמדים שכבר הוצגו בסבב הנוכחי של "עוד הצעה").
export const chooseFiltersSchema = z.object({
  scope: z.enum(["matches", "all"]),
  maxBudgetMinor: z.number().int().min(0).max(100_000_000).optional(),
  maxDurationMinutes: z.number().int().min(1).max(525_600).optional(),
  category: z.enum(ideaCategories).optional(),
  locationText: z.string().max(200).optional(),
  allowUnknown: z.boolean(),
  excludedIdeaIds: z.array(z.string().uuid()).max(50).default([]),
});

export type ChooseFilters = z.infer<typeof chooseFiltersSchema>;
