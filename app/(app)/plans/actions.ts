"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPlan,
  updatePlan,
  cancelPlan,
  completePlan,
  getPlan,
} from "@/lib/dal/plans";
import { getIdea, archiveIdea } from "@/lib/dal/ideas";
import {
  createPlanSchema,
  updatePlanSchema,
  planIdVersionSchema,
  completePlanSchema,
} from "@/lib/validation/plan";
import type { Result } from "@/lib/errors/result";
import { fail } from "@/lib/errors/result";
import { notifyPartner } from "@/lib/push";

function revalidatePlanPaths(planId?: string) {
  revalidatePath("/plans");
  revalidatePath("/");
  if (planId) revalidatePath(`/plans/${planId}`);
}

export async function createPlanAction(
  input: unknown,
): Promise<Result<{ id: string }> | undefined> {
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "INVALID_INPUT",
      "יש שגיאות בטופס",
      crypto.randomUUID(),
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const result = await createPlan(parsed.data);
  if (!result.ok) return result;
  notifyPartner({ kind: "plan_created", planId: result.data.id });

  revalidatePlanPaths(result.data.id);
  revalidatePath(`/ideas/${parsed.data.ideaId}`);
  redirect(`/plans/${result.data.id}`);
}

export async function updatePlanAction(input: unknown) {
  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "INVALID_INPUT",
      "יש שגיאות בטופס",
      crypto.randomUUID(),
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }
  const result = await updatePlan(parsed.data);
  if (result.ok) {
    revalidatePlanPaths(parsed.data.id);
    notifyPartner({ kind: "plan_updated", planId: parsed.data.id });
  }
  return result;
}

export async function cancelPlanAction(input: unknown) {
  const parsed = planIdVersionSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "בקשה לא תקינה", crypto.randomUUID());
  const result = await cancelPlan(parsed.data.id, parsed.data.expectedVersion);
  if (result.ok) {
    revalidatePlanPaths(parsed.data.id);
    notifyPartner({ kind: "plan_cancelled", planId: parsed.data.id });
  }
  return result;
}

export async function completePlanAction(input: unknown) {
  const parsed = completePlanSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "INVALID_INPUT",
      "יש שגיאות בטופס",
      crypto.randomUUID(),
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }
  const result = await completePlan(parsed.data);
  if (!result.ok) return result;
  notifyPartner({ kind: "memory_created", memoryId: result.data.memoryId });

  revalidatePlanPaths(parsed.data.id);
  revalidatePath("/memories");

  // "להעביר את הרעיון לארכיון?" — best-effort, לא חלק מהטרנזקציה של
  // complete_plan (שכבר הצליחה, זה מה שחשוב). ideaId וגרסתו הנוכחית
  // נשלפים כאן בשרת, לא מהלקוח (אין אמון ב-spaceId/id של הלקוח, spec 9.1).
  // אם הארכוב נכשל (למשל תוכנית proposed אחרת נוצרה בינתיים) — מתעלמים,
  // כי השלמת התוכנית עצמה כבר הצליחה ולא רוצים להציג את זה ככישלון.
  if (parsed.data.archiveIdea) {
    const plan = await getPlan(parsed.data.id);
    if (plan) {
      const idea = await getIdea(plan.ideaId);
      if (idea && idea.status === "active") {
        await archiveIdea(idea.id, idea.version);
        revalidatePath("/ideas");
        revalidatePath(`/ideas/${idea.id}`);
      }
    }
  }

  return result;
}

// "לא יצא" -> דחייה בשבוע, בלחיצה אחת (25.9). אותה שעה, אותו משך, בדיוק
// 7 ימים אחרי. הפרטים האחרים (מקום, הערות, תקציב) נשמרים כמו שהם — נקראים
// כאן מהשרת, לא מהלקוח. בן/בת הזוג מקבלים "עדכון בתוכנית" עם המועד החדש.
export async function postponePlanWeekAction(input: unknown) {
  const parsed = planIdVersionSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "בקשה לא תקינה", crypto.randomUUID());
  const plan = await getPlan(parsed.data.id);
  if (!plan || plan.status !== "proposed") return fail("NOT_FOUND", "התוכנית כבר לא פעילה", crypto.randomUUID());
  if (!plan.startsAt) return fail("INVALID_INPUT", "לתוכנית אין מועד לדחות", crypto.randomUUID());

  const week = 7 * 86_400_000;
  const shift = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + week).toISOString() : undefined);
  const result = await updatePlan({
    id: plan.id,
    expectedVersion: parsed.data.expectedVersion,
    startsAt: shift(plan.startsAt),
    endsAt: shift(plan.endsAt),
    timezone: plan.timezone,
    meetingPlace: plan.meetingPlace ?? undefined,
    notes: plan.notes,
    budgetMinor: plan.budgetMinor ?? undefined,
  });
  if (result.ok) {
    revalidatePlanPaths(plan.id);
    notifyPartner({ kind: "plan_updated", planId: plan.id });
  }
  return result;
}
