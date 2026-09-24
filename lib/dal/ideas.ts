import "server-only";

import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";
import type { CreateIdeaInput, IdeaCategory } from "@/lib/validation/idea";

export type IdeaDto = {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  locationText: string | null;
  sourceUrl: string | null;
  costMinor: number | null;
  durationMinutes: number | null;
  createdAt: string;
  myReaction: "yes" | "maybe" | "no" | null;
};

type IdeaRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  location_text: string | null;
  source_url: string | null;
  cost_minor: number | null;
  duration_minutes: number | null;
  created_at: string;
};

// listIdeas — קריאה בלבד, דרך client עם JWT המשתמש ו-RLS (member_read /
// own_reaction_read). ראו spec סעיף 13.3.
// TODO (המשך F3): חיפוש, פילטר קטגוריה/מאצ'ים/תגובה שלי, מיון, pagination —
// כרגע כל הרעיונות הפעילים של המרחב, מהחדש לישן, בלי הגבלה.
export async function listIdeas(): Promise<IdeaDto[]> {
  const supabase = await createSupabaseServerClient();

  const { data: ideas } = await supabase
    .from("ideas")
    .select("id, title, description, category, location_text, source_url, cost_minor, duration_minutes, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .returns<IdeaRow[]>();

  if (!ideas || ideas.length === 0) return [];

  const ideaIds = ideas.map((i) => i.id);
  const { data: reactions } = await supabase
    .from("idea_reactions")
    .select("idea_id, preference")
    .in("idea_id", ideaIds)
    .returns<{ idea_id: string; preference: "yes" | "maybe" | "no" }[]>();

  const myReactionByIdea = new Map((reactions ?? []).map((r) => [r.idea_id, r.preference]));

  return ideas.map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    category: i.category as IdeaCategory,
    locationText: i.location_text,
    sourceUrl: i.source_url,
    costMinor: i.cost_minor,
    durationMinutes: i.duration_minutes,
    createdAt: i.created_at,
    myReaction: myReactionByIdea.get(i.id) ?? null,
  }));
}

export type IdeaDetailDto = IdeaDto & { isMatch: boolean; activePlanId: string | null };

// getIdea — קריאה בלבד. isMatch מחושב דרך list_my_matches (RPC שכבר גרנטד
// ל-authenticated ב-0002_rls.sql) כי own_reaction_read חוסם קריאת תגובת
// בן/בת הזוג ישירות — זו בדיוק הסיבה ש-list_my_matches קיימת כ-RPC נפרדת.
// ראו spec סעיף 13.3: תוכן, תגובתי האישית, isMatch (ללא תגובת האחר).
// activePlanId — תוכנית proposed קיימת לרעיון הזה, אם יש (one_active_plan_per_idea);
// ה-UI מציג "תכננו את זה" רק כשאין כזו, ומקשר לקיימת אחרת (F6).
export async function getIdea(ideaId: string): Promise<IdeaDetailDto | null> {
  const supabase = await createSupabaseServerClient();

  const { data: idea } = await supabase
    .from("ideas")
    .select(
      "id, space_id, title, description, category, location_text, source_url, cost_minor, duration_minutes, created_at",
    )
    .eq("id", ideaId)
    .maybeSingle<IdeaRow & { space_id: string }>();
  if (!idea) return null;

  const [{ data: reaction }, { data: matchIds }, { data: activePlan }] = await Promise.all([
    supabase
      .from("idea_reactions")
      .select("preference")
      .eq("idea_id", ideaId)
      .maybeSingle<{ preference: "yes" | "maybe" | "no" }>(),
    supabase.rpc("list_my_matches", { p_space: idea.space_id }),
    supabase
      .from("plans")
      .select("id")
      .eq("idea_id", ideaId)
      .eq("status", "proposed")
      .maybeSingle<{ id: string }>(),
  ]);

  const isMatch = Array.isArray(matchIds)
    ? matchIds.some((m: { idea_id: string }) => m.idea_id === ideaId)
    : false;

  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    category: idea.category as IdeaCategory,
    locationText: idea.location_text,
    sourceUrl: idea.source_url,
    costMinor: idea.cost_minor,
    durationMinutes: idea.duration_minutes,
    createdAt: idea.created_at,
    myReaction: reaction?.preference ?? null,
    isMatch,
    activePlanId: activePlan?.id ?? null,
  };
}

// createIdea — RPC שירות (create_idea, 0007_idea_rpcs.sql). requestId קבוע
// לאורך retry -> אידמפוטנטי. ראו spec סעיף 13.2.
export async function createIdea(input: CreateIdeaInput): Promise<Result<{ id: string }>> {
  const traceId = crypto.randomUUID();

  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("create_idea", {
    p_actor: userId,
    p_request_id: input.requestId,
    p_title: input.title,
    p_description: input.description ?? "",
    p_category: input.category ?? "other",
    p_location_text: input.locationText ?? null,
    p_source_url: input.sourceUrl ?? null,
    p_cost_minor: input.costMinor ?? null,
    p_duration_minutes: input.durationMinutes ?? null,
  });

  if (error || !data) {
    if (error?.message?.includes("NOT_MEMBER")) {
      return fail("UNAUTHENTICATED", "צריך מרחב פעיל כדי להוסיף רעיון", traceId);
    }
    if (error?.message?.includes("VERSION_CONFLICT")) {
      return fail("VERSION_CONFLICT", "הבקשה הזו כבר נשלחה עם נתונים אחרים", traceId);
    }
    if (error?.message?.includes("INVALID_INPUT")) {
      return fail("INVALID_INPUT", "כותרת חסרה או לא תקינה", traceId);
    }
    return fail("UNEXPECTED", "שמירת הרעיון נכשלה, נסו שוב", traceId);
  }

  return ok({ id: (data as { id: string }).id }, traceId);
}

// setReaction — RPC שירות (set_reaction). preference=null מוחק את התגובה.
export async function setReaction(
  ideaId: string,
  preference: "yes" | "maybe" | "no" | null,
): Promise<Result<{ preference: "yes" | "maybe" | "no" | null; isMatch: boolean }>> {
  const traceId = crypto.randomUUID();

  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("set_reaction", {
    p_actor: userId,
    p_idea_id: ideaId,
    p_preference: preference,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    if (error?.message?.includes("NOT_FOUND")) {
      return fail("NOT_FOUND", "הרעיון הזה כבר לא זמין", traceId);
    }
    if (error?.message?.includes("INVALID_INPUT")) {
      return fail("INVALID_INPUT", "תגובה לא תקינה", traceId);
    }
    return fail("UNEXPECTED", "שמירת התגובה נכשלה, נסו שוב", traceId);
  }

  const row = data[0] as { preference: "yes" | "maybe" | "no" | null; is_match: boolean };
  return ok({ preference: row.preference, isMatch: row.is_match }, traceId);
}
