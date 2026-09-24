import "server-only";

import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";
import type { IdeaCategory } from "@/lib/validation/idea";
import type { UpdateMemoryInput } from "@/lib/validation/memory";

// זיכרונות — F7, spec סעיף 6 ו-13.2/13.3 (listMemories/getMemory/updateMemory).
// קריאה דרך client המשתמש + RLS (member_read על memories/plans/ideas,
// profiles_read). כתיבה רק דרך update_memory (0016, service_role).
// בשלב הזה בלי תמונות — memory_photos/Storage לא נקראים בכלל.
//
// כותרת הזיכרון = כותרת התוכנית שהושלמה; תמונת העיצוב = קטגוריית הרעיון
// של התוכנית (lib/covers.ts). את שניהם מצרפים כאן בזיכרון: שאילתות שטוחות
// במקביל (קפיצת רשת אחת) במקום embedding של PostgREST, בדיוק כמו בשאר ה-DAL.
// בקנה המידה של זוג אחד אלה עשרות שורות לכל היותר.

export type MemoryDto = {
  id: string;
  planId: string;
  title: string;
  category: IdeaCategory | null;
  happenedOn: string; // YYYY-MM-DD
  story: string;
  version: number;
  createdByName: string;
};

type MemoryRow = {
  id: string;
  plan_id: string;
  created_by: string;
  happened_on: string;
  story: string;
  version: number;
};

const MEMORY_COLUMNS = "id, plan_id, created_by, happened_on, story, version";

async function loadContext() {
  const supabase = await createSupabaseServerClient();
  return {
    supabase,
    context: Promise.all([
      supabase
        .from("plans")
        .select("id, title, idea_id")
        .eq("status", "completed")
        .returns<{ id: string; title: string; idea_id: string }[]>(),
      supabase.from("ideas").select("id, category").returns<{ id: string; category: IdeaCategory }[]>(),
      // RLS (can_read_profile) מחזיר רק אותי ואת בן/בת הזוג.
      supabase.from("profiles").select("id, display_name").returns<{ id: string; display_name: string }[]>(),
    ]),
  };
}

function toDtos(
  rows: MemoryRow[],
  [plansRes, ideasRes, profilesRes]: Awaited<Awaited<ReturnType<typeof loadContext>>["context"]>,
): MemoryDto[] {
  const planById = new Map((plansRes.data ?? []).map((p) => [p.id, p]));
  const categoryByIdea = new Map((ideasRes.data ?? []).map((i) => [i.id, i.category]));
  const nameById = new Map((profilesRes.data ?? []).map((p) => [p.id, p.display_name]));

  return rows.map((m) => {
    const plan = planById.get(m.plan_id);
    return {
      id: m.id,
      planId: m.plan_id,
      title: plan?.title ?? "זיכרון",
      category: plan ? (categoryByIdea.get(plan.idea_id) ?? null) : null,
      happenedOn: m.happened_on,
      story: m.story,
      version: m.version,
      createdByName: nameById.get(m.created_by)?.trim() ?? "",
    };
  });
}

// ציר זמן: החדש למעלה. שובר שוויון יציב לפי id (תואם לאינדקס memories_feed).
export async function listMemories(): Promise<MemoryDto[]> {
  const { supabase, context } = await loadContext();
  const [memoriesRes, ctx] = await Promise.all([
    supabase
      .from("memories")
      .select(MEMORY_COLUMNS)
      .order("happened_on", { ascending: false })
      .order("id", { ascending: false })
      .returns<MemoryRow[]>(),
    context,
  ]);
  return toDtos(memoriesRes.data ?? [], ctx);
}

export async function getLatestMemory(): Promise<MemoryDto | null> {
  const { supabase, context } = await loadContext();
  const [memoryRes, ctx] = await Promise.all([
    supabase
      .from("memories")
      .select(MEMORY_COLUMNS)
      .order("happened_on", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle<MemoryRow>(),
    context,
  ]);
  return memoryRes.data ? toDtos([memoryRes.data], ctx)[0] : null;
}

// זר/חסר מחזיר null בשני המקרים — 404 זהה (כמו /ideas/[id], /plans/[id]).
export async function getMemory(memoryId: string): Promise<MemoryDto | null> {
  const { supabase, context } = await loadContext();
  const [memoryRes, ctx] = await Promise.all([
    supabase.from("memories").select(MEMORY_COLUMNS).eq("id", memoryId).maybeSingle<MemoryRow>(),
    context,
  ]);
  return memoryRes.data ? toDtos([memoryRes.data], ctx)[0] : null;
}

// לכפתור "לזיכרון" בתוכנית שהושלמה (unique על memories.plan_id).
export async function getMemoryIdForPlan(planId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("memories").select("id").eq("plan_id", planId).maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

export async function updateMemory(input: UpdateMemoryInput): Promise<Result<{ id: string; version: number }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("update_memory", {
    p_actor: userId,
    p_id: input.memoryId,
    p_expected_version: input.expectedVersion,
    p_happened_on: input.happenedOn,
    p_story: input.story ?? "",
  });

  if (error || !data) {
    const msg = error?.message;
    if (msg?.includes("NOT_FOUND")) return fail("NOT_FOUND", "הזיכרון הזה כבר לא זמין", traceId);
    if (msg?.includes("VERSION_CONFLICT")) {
      return fail(
        "VERSION_CONFLICT",
        "הזיכרון עודכן בינתיים. הטקסט שלך נשאר כאן — אפשר להעתיק אותו, לרענן ולשמור שוב.",
        traceId,
      );
    }
    if (msg?.includes("INVALID_INPUT")) {
      return fail("INVALID_INPUT", "התאריך לא יכול להיות בעתיד, והסיפור עד 5,000 תווים", traceId);
    }
    return fail("UNEXPECTED", "שמירת הזיכרון נכשלה, נסו שוב", traceId);
  }

  const memory = data as { id: string; version: number };
  return ok({ id: memory.id, version: memory.version }, traceId);
}
