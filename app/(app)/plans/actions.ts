"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPlan,
  updatePlan,
  confirmPlan,
  unconfirmPlan,
  cancelPlan,
  completePlan,
} from "@/lib/dal/plans";
import {
  createPlanSchema,
  updatePlanSchema,
  planIdVersionSchema,
  completePlanSchema,
} from "@/lib/validation/plan";
import type { Result } from "@/lib/errors/result";
import { fail } from "@/lib/errors/result";

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
  if (result.ok) revalidatePlanPaths(parsed.data.id);
  return result;
}

export async function confirmPlanAction(input: unknown) {
  const parsed = planIdVersionSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "בקשה לא תקינה", crypto.randomUUID());
  const result = await confirmPlan(parsed.data.id, parsed.data.expectedVersion);
  if (result.ok) revalidatePlanPaths(parsed.data.id);
  return result;
}

export async function unconfirmPlanAction(input: unknown) {
  const parsed = planIdVersionSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "בקשה לא תקינה", crypto.randomUUID());
  const result = await unconfirmPlan(parsed.data.id, parsed.data.expectedVersion);
  if (result.ok) revalidatePlanPaths(parsed.data.id);
  return result;
}

export async function cancelPlanAction(input: unknown) {
  const parsed = planIdVersionSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "בקשה לא תקינה", crypto.randomUUID());
  const result = await cancelPlan(parsed.data.id, parsed.data.expectedVersion);
  if (result.ok) revalidatePlanPaths(parsed.data.id);
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
  if (result.ok) revalidatePlanPaths(parsed.data.id);
  return result;
}
