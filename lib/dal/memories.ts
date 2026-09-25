import "server-only";

import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";
import type { IdeaCategory } from "@/lib/validation/idea";
import { pickOnThisDay, type UpdateMemoryInput } from "@/lib/validation/memory";

// זיכרונות — F7, spec סעיף 6 ו-13.2/13.3 (listMemories/getMemory/updateMemory).
// קריאה דרך client המשתמש + RLS (member_read על memories/plans/ideas,
// profiles_read). כתיבה רק דרך update_memory (0016, service_role).
// תמונות: כאן רק תמונת השער + מספר (memory_photos דרך RLS, ready בלבד);
// הרשימה המלאה והקבצים עצמם ב-lib/dal/photos.ts.
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
  coverPhotoId: string | null; // הראשונה לפי הסדר — מוצגת במקום איור הקטגוריה
  photoCount: number;
  place: string | null; // מקום המפגש בתוכנית, או המיקום של הרעיון — לחיפוש
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
        .select("id, title, idea_id, meeting_place")
        .eq("status", "completed")
        .returns<{ id: string; title: string; idea_id: string; meeting_place: string | null }[]>(),
      supabase
        .from("ideas")
        .select("id, category, location_text")
        .returns<{ id: string; category: IdeaCategory; location_text: string | null }[]>(),
      // RLS (can_read_profile) מחזיר רק אותי ואת בן/בת הזוג.
      supabase.from("profiles").select("id, display_name").returns<{ id: string; display_name: string }[]>(),
      supabase
        .from("memory_photos")
        .select("id, memory_id")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<{ id: string; memory_id: string }[]>(),
    ]),
  };
}

function toDtos(
  rows: MemoryRow[],
  [plansRes, ideasRes, profilesRes, photosRes]: Awaited<Awaited<ReturnType<typeof loadContext>>["context"]>,
): MemoryDto[] {
  const planById = new Map((plansRes.data ?? []).map((p) => [p.id, p]));
  const ideaById = new Map((ideasRes.data ?? []).map((i) => [i.id, i]));
  const nameById = new Map((profilesRes.data ?? []).map((p) => [p.id, p.display_name]));
  const photosByMemory = new Map<string, { coverId: string; count: number }>();
  for (const p of photosRes.data ?? []) {
    const cur = photosByMemory.get(p.memory_id);
    if (cur) cur.count += 1;
    else photosByMemory.set(p.memory_id, { coverId: p.id, count: 1 });
  }

  return rows.map((m) => {
    const plan = planById.get(m.plan_id);
    const idea = plan ? ideaById.get(plan.idea_id) : undefined;
    return {
      id: m.id,
      planId: m.plan_id,
      title: plan?.title ?? "זיכרון",
      category: idea?.category ?? null,
      happenedOn: m.happened_on,
      story: m.story,
      version: m.version,
      createdByName: nameById.get(m.created_by)?.trim() ?? "",
      coverPhotoId: photosByMemory.get(m.id)?.coverId ?? null,
      photoCount: photosByMemory.get(m.id)?.count ?? 0,
      place: plan?.meeting_place?.trim() || idea?.location_text?.trim() || null,
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

// "לפני שנה בדיוק" בבית (26.9) — lib/validation/memory.ts pickOnThisDay.
// שורות קטנות (id + תאריך + האם יש תמונה); ה-DTO המלא רק לזיכרון שנבחר.
export async function getOnThisDay(now = new Date()): Promise<{ memory: MemoryDto; label: string } | null> {
  const supabase = await createSupabaseServerClient();
  const [{ data: rows }, { data: photos }] = await Promise.all([
    supabase.from("memories").select("id, happened_on").returns<{ id: string; happened_on: string }[]>(),
    supabase.from("memory_photos").select("memory_id").returns<{ memory_id: string }[]>(),
  ]);
  const withPhoto = new Set((photos ?? []).map((p) => p.memory_id));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);
  const pick = pickOnThisDay(
    (rows ?? []).map((r) => ({ id: r.id, happenedOn: r.happened_on, hasPhoto: withPhoto.has(r.id) })),
    today,
  );
  if (!pick) return null;
  const memory = await getMemory(pick.id);
  return memory ? { memory, label: pick.label } : null;
}
