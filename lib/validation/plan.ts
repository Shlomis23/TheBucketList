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
