import "server-only";

import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";
import type {
  CreatePlanInput,
  UpdatePlanInput,
  CompletePlanInput,
} from "@/lib/validation/plan";
import type { IdeaCategory } from "@/lib/validation/idea";
import { extractHttpsLinks } from "@/lib/validation/comment";

export type PlanStatus = "proposed" | "completed" | "cancelled";

export type PlanConfirmationDto = {
  userId: string;
  displayName: string;
  confirmedAt: string;
};

export type PlanDto = {
  id: string;
  ideaId: string;
  ideaCategory: IdeaCategory | null;
  title: string;
  status: PlanStatus;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  meetingPlace: string | null;
  notes: string;
  budgetMinor: number | null;
  version: number;
  createdAt: string;
  confirmations: PlanConfirmationDto[];
  isConfirmedByBoth: boolean;
  myConfirmation: boolean;
  // מהרעיון המקורי — לכרטיס "מהרעיון" בדף התוכנית (25.9): קישור ומיקום
  // יושבים ברעיון, ובלי זה היה צריך לעבור דרך לשונית הרעיונות כדי להגיע אליהם.
  ideaSourceUrl: string | null;
  ideaLocationText: string | null;
  ideaPlaceId: string | null;
};

// getPlan בלבד: קישורים שהודבקו בשיחה על הרעיון (החדשים קודם, עד 3, בלי כפילות).
export type PlanDetailDto = PlanDto & { conversationLinks: string[] };

type PlanRow = {
  id: string;
  idea_id: string;
  title: string;
  status: PlanStatus;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  meeting_place: string | null;
  notes: string;
  budget_minor: number | null;
  version: number;
  created_at: string;
};

type ConfirmationRow = { plan_id: string; user_id: string; plan_version: number; confirmed_at: string };

// listPlans/getPlan — קריאה בלבד, דרך client עם JWT המשתמש; member_read
// policy מכסה plans/plan_confirmations, profiles_read מכסה display_name של
// בן/בת הזוג (0002_rls.sql). "מאושר לשנינו" נגזר כאן, לא נשמר בעמודה
// (ראו spec סעיף 7 ו-0009_plan_rpcs.sql).
async function attachConfirmations(
  plans: PlanRow[],
  userId: string,
): Promise<PlanDto[]> {
  if (plans.length === 0) return [];
  const supabase = await createSupabaseServerClient();

  const planIds = plans.map((p) => p.id);
  const ideaIds = Array.from(new Set(plans.map((p) => p.idea_id)));
  const [{ data: confirmations }, { data: ideas }, { data: profiles }] = await Promise.all([
    supabase
      .from("plan_confirmations")
      .select("plan_id, user_id, plan_version, confirmed_at")
      .in("plan_id", planIds)
      .returns<ConfirmationRow[]>(),
    // קטגוריה (תמונת עטיפה, lib/covers.ts) + קישור ומיקום לכרטיס "מהרעיון".
    supabase
      .from("ideas")
      .select("id, category, source_url, location_text, place_id")
      .in("id", ideaIds)
      .returns<{ id: string; category: IdeaCategory; source_url: string | null; location_text: string | null; place_id: string | null }[]>(),
    // שמות המאשרים: בלי .in(userIds) — RLS (can_read_profile) מחזיר ממילא רק
    // אותי ואת בן/בת הזוג, וכך זה רץ במקביל ולא כקפיצת רשת נוספת אחרי האישורים.
    supabase.from("profiles").select("id, display_name").returns<{ id: string; display_name: string }[]>(),
  ]);
  const ideaById = new Map((ideas ?? []).map((i) => [i.id, i]));

  const nameByUser = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const confirmationsByPlan = new Map<string, ConfirmationRow[]>();
  for (const c of confirmations ?? []) {
    const list = confirmationsByPlan.get(c.plan_id) ?? [];
    list.push(c);
    confirmationsByPlan.set(c.plan_id, list);
  }

  return plans.map((p) => {
    const rows = (confirmationsByPlan.get(p.id) ?? []).filter((c) => c.plan_version === p.version);
    return {
      id: p.id,
      ideaId: p.idea_id,
      ideaCategory: ideaById.get(p.idea_id)?.category ?? null,
      ideaSourceUrl: ideaById.get(p.idea_id)?.source_url ?? null,
      ideaLocationText: ideaById.get(p.idea_id)?.location_text ?? null,
      ideaPlaceId: ideaById.get(p.idea_id)?.place_id ?? null,
      title: p.title,
      status: p.status,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      timezone: p.timezone,
      meetingPlace: p.meeting_place,
      notes: p.notes,
      budgetMinor: p.budget_minor,
      version: p.version,
      createdAt: p.created_at,
      confirmations: rows.map((r) => ({
        userId: r.user_id,
        displayName: nameByUser.get(r.user_id) ?? "",
        confirmedAt: r.confirmed_at,
      })),
      isConfirmedByBoth: rows.length >= 2,
      myConfirmation: rows.some((r) => r.user_id === userId),
    };
  });
}

// listPlans — כל התוכניות של המרחב. סדר וקיבוץ (מוצעות/מאושרות/עבר,
// מועד לא נקבע בסוף) נעשים ברכיב התצוגה על סמך status/isConfirmedByBoth.
export async function listPlans(): Promise<PlanDto[]> {
  const userId = await getVerifiedUserId();
  if (!userId) return [];

  const supabase = await createSupabaseServerClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("id, idea_id, title, status, starts_at, ends_at, timezone, meeting_place, notes, budget_minor, version, created_at")
    .order("starts_at", { ascending: true, nullsFirst: false })
    .returns<PlanRow[]>();

  return attachConfirmations(plans ?? [], userId);
}

export async function getPlan(planId: string): Promise<PlanDetailDto | null> {
  const userId = await getVerifiedUserId();
  if (!userId) return null;

  const supabase = await createSupabaseServerClient();
  const { data: plan } = await supabase
    .from("plans")
    .select("id, idea_id, title, status, starts_at, ends_at, timezone, meeting_place, notes, budget_minor, version, created_at")
    .eq("id", planId)
    .maybeSingle<PlanRow>();
  if (!plan) return null;

  // הקישורים מהשיחה נשלפים במקביל לאישורים — idea_id כבר ידוע מהשורה.
  const [[dto], { data: comments }] = await Promise.all([
    attachConfirmations([plan], userId),
    supabase
      .from("idea_comments")
      .select("body")
      .eq("idea_id", plan.idea_id)
      .order("created_at", { ascending: false })
      .returns<{ body: string }[]>(),
  ]);
  if (!dto) return null;

  const seen = new Set<string>(dto.ideaSourceUrl ? [dto.ideaSourceUrl] : []);
  const conversationLinks: string[] = [];
  for (const c of comments ?? []) {
    for (const url of extractHttpsLinks(c.body)) {
      if (seen.has(url)) continue;
      seen.add(url);
      conversationLinks.push(url);
    }
  }
  return { ...dto, conversationLinks: conversationLinks.slice(0, 3) };
}

function mapPlanRpcError(errorMessage: string | undefined, fallback: string, traceId: string): Result<never> {
  if (errorMessage?.includes("NOT_FOUND")) {
    return fail("NOT_FOUND", "התוכנית הזו כבר לא זמינה", traceId);
  }
  if (errorMessage?.includes("ACTIVE_PLAN_EXISTS")) {
    return fail("VERSION_CONFLICT", "כבר יש תוכנית פעילה לרעיון הזה", traceId);
  }
  if (errorMessage?.includes("VERSION_CONFLICT")) {
    return fail("VERSION_CONFLICT", "התוכנית השתנתה בינתיים — רעננו ונסו שוב", traceId);
  }
  if (errorMessage?.includes("NOT_ENOUGH_MEMBERS")) {
    return fail("INVALID_INPUT", "אי אפשר לאשר בלי בן/בת זוג פעיל/ה במרחב", traceId);
  }
  if (errorMessage?.includes("INVALID_INPUT")) {
    return fail("INVALID_INPUT", "יש שגיאה בנתוני התוכנית", traceId);
  }
  return fail("UNEXPECTED", fallback, traceId);
}

export async function createPlan(input: CreatePlanInput): Promise<Result<{ id: string }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("create_plan", {
    p_actor: userId,
    p_request_id: input.requestId,
    p_idea_id: input.ideaId,
    p_starts_at: input.startsAt ?? null,
    p_ends_at: input.endsAt ?? null,
    p_timezone: input.timezone,
    p_meeting_place: input.meetingPlace ?? null,
    p_notes: input.notes,
    p_budget_minor: input.budgetMinor ?? null,
  });

  if (error || !data) {
    return mapPlanRpcError(error?.message, "יצירת התוכנית נכשלה, נסו שוב", traceId);
  }
  return ok({ id: (data as { id: string }).id }, traceId);
}

export async function updatePlan(input: UpdatePlanInput): Promise<Result<{ version: number }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("update_plan", {
    p_actor: userId,
    p_id: input.id,
    p_expected_version: input.expectedVersion,
    p_starts_at: input.startsAt ?? null,
    p_ends_at: input.endsAt ?? null,
    p_timezone: input.timezone,
    p_meeting_place: input.meetingPlace ?? null,
    p_notes: input.notes,
    p_budget_minor: input.budgetMinor ?? null,
  });

  if (error || !data) {
    return mapPlanRpcError(error?.message, "עדכון התוכנית נכשל, נסו שוב", traceId);
  }
  return ok({ version: (data as { version: number }).version }, traceId);
}

async function callPlanTransitionRpc(
  fnName: "confirm_plan" | "unconfirm_plan",
  planId: string,
  expectedVersion: number,
): Promise<Result<{ isConfirmedByBoth: boolean; version: number }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc(fnName, {
    p_actor: userId,
    p_id: planId,
    p_expected_version: expectedVersion,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return mapPlanRpcError(
      error?.message,
      fnName === "confirm_plan" ? "האישור נכשל, נסו שוב" : "ביטול האישור נכשל, נסו שוב",
      traceId,
    );
  }
  const row = data[0] as { version: number; is_confirmed_by_both: boolean };
  return ok({ version: row.version, isConfirmedByBoth: row.is_confirmed_by_both }, traceId);
}

export function confirmPlan(planId: string, expectedVersion: number) {
  return callPlanTransitionRpc("confirm_plan", planId, expectedVersion);
}

export function unconfirmPlan(planId: string, expectedVersion: number) {
  return callPlanTransitionRpc("unconfirm_plan", planId, expectedVersion);
}

export async function cancelPlan(planId: string, expectedVersion: number): Promise<Result<{ version: number }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("cancel_plan", {
    p_actor: userId,
    p_id: planId,
    p_expected_version: expectedVersion,
  });

  if (error || !data) {
    return mapPlanRpcError(error?.message, "ביטול התוכנית נכשל, נסו שוב", traceId);
  }
  return ok({ version: (data as { version: number }).version }, traceId);
}

export async function completePlan(input: CompletePlanInput): Promise<Result<{ memoryId: string }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("complete_plan", {
    p_actor: userId,
    p_request_id: input.requestId,
    p_id: input.id,
    p_expected_version: input.expectedVersion,
    p_happened_on: input.happenedOn,
    p_story: input.story,
  });

  if (error || !data) {
    return mapPlanRpcError(error?.message, "סימון ההשלמה נכשל, נסו שוב", traceId);
  }
  return ok({ memoryId: data as string }, traceId);
}
