import "server-only";

import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";
import type { CreateIdeaInput, UpdateIdeaInput, IdeaCategory } from "@/lib/validation/idea";
import type { IdeaListFilters, IdeaListSort } from "@/lib/validation/ideaList";

export type IdeaStatus = "active" | "archived";

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
  isMatch: boolean;
  status: IdeaStatus;
  version: number;
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
  status: string;
  version: number;
};

// listIdeas — קריאה בלבד, דרך client עם JWT המשתמש ו-RLS (member_read /
// own_reaction_read). ראו spec סעיף 6 ו-13.3, lib/validation/ideaList.ts.
//
// שתי קפיצות רשת בלבד (קודם היו שלוש ברצף):
//   1. במקביל: הרעיונות בסטטוס המבוקש + כל התגובות *שלי* (RLS מחזיר רק
//      אותן — own_reaction_read; תגובות בן/בת הזוג לא נקראות אף פעם).
//   2. list_my_matches (הבטוחה, לא חושפת את תגובת האחר) — רק לרשימה הפעילה
//      (ה-RPC מחזיר ממילא רק פעילים), עם space_id מהשורות עצמן במקום
//      שאילתת getMySpaceId נפרדת (RLS כבר מבטיח שכולן מהמרחב שלי).
//
// חיפוש/קטגוריה/תצוגה/מיון נעשים כאן בזיכרון: בקנה המידה של זוג אחד זה
// עשרות רעיונות, וכך גם המונים על הצ'יפים ("עוד לא הגבתי · 3") מחושבים
// מאותה שליפה בלי שאילתות count נוספות. cursor pagination (spec: 20 בעמוד)
// נדחה בכוונה עד שיהיה בו צורך אמיתי.
export type IdeaListCounts = { all: number; unreacted: number; matches: number };

// פריט ברשימה = IdeaDto + מספר הודעות בשיחה (אייקון בועה בשורה).
export type IdeaListItemDto = IdeaDto & { commentCount: number };

export async function listIdeas(
  filters: IdeaListFilters,
): Promise<{ ideas: IdeaListItemDto[]; counts: IdeaListCounts }> {
  const supabase = await createSupabaseServerClient();

  const [{ data: rows }, { data: reactions }, { data: commentRows }] = await Promise.all([
    supabase
      .from("ideas")
      .select(
        "id, space_id, title, description, category, location_text, source_url, cost_minor, duration_minutes, created_at, status, version",
      )
      .eq("status", filters.status)
      .order("created_at", { ascending: false })
      .returns<(IdeaRow & { space_id: string })[]>(),
    supabase
      .from("idea_reactions")
      .select("idea_id, preference")
      .returns<{ idea_id: string; preference: "yes" | "maybe" | "no" }[]>(),
    // מונה הודעות לכל רעיון (member_read) — באותה קפיצה, סופרים בזיכרון.
    supabase.from("idea_comments").select("idea_id").returns<{ idea_id: string }[]>(),
  ]);

  if (!rows || rows.length === 0) return { ideas: [], counts: { all: 0, unreacted: 0, matches: 0 } };

  let matchedIds = new Set<string>();
  if (filters.status === "active") {
    const { data: matches } = await supabase.rpc("list_my_matches", { p_space: rows[0].space_id });
    if (Array.isArray(matches)) {
      matchedIds = new Set((matches as { idea_id: string }[]).map((m) => m.idea_id));
    }
  }

  const myReactionByIdea = new Map((reactions ?? []).map((r) => [r.idea_id, r.preference]));

  const commentCountByIdea = new Map<string, number>();
  for (const c of commentRows ?? []) {
    commentCountByIdea.set(c.idea_id, (commentCountByIdea.get(c.idea_id) ?? 0) + 1);
  }

  const all: IdeaListItemDto[] = rows.map((i) => ({
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
    isMatch: matchedIds.has(i.id),
    status: i.status as IdeaStatus,
    version: i.version,
    commentCount: commentCountByIdea.get(i.id) ?? 0,
  }));

  // חיפוש + קטגוריה קודם, ורק אז המונים לפי תצוגה — כך "עוד לא הגבתי · 3"
  // תמיד מתאר את מה שיופיע בפועל בלחיצה, בתוך החיפוש/הקטגוריה הנוכחיים.
  const needle = filters.q.toLocaleLowerCase("he");
  const narrowed = all.filter(
    (i) =>
      (!filters.category || i.category === filters.category) &&
      (!needle ||
        [i.title, i.locationText ?? "", i.description].some((t) =>
          t.toLocaleLowerCase("he").includes(needle),
        )),
  );

  const counts: IdeaListCounts = {
    all: narrowed.length,
    unreacted: narrowed.filter((i) => i.myReaction === null).length,
    matches: narrowed.filter((i) => i.isMatch).length,
  };

  const visible = narrowed.filter((i) =>
    filters.view === "unreacted" ? i.myReaction === null : filters.view === "matches" ? i.isMatch : true,
  );

  return { ideas: sortIdeas(visible, filters.sort), counts };
}

// "הכי זולים"/"הכי קצרים": ערך לא ידוע (NULL) תמיד בסוף, לא כאילו הוא 0
// (0 = חינם, NULL = לא ידוע — ראו formatCostMinor). שובר שוויון: החדש קודם.
function sortIdeas<T extends IdeaDto>(ideas: T[], sort: IdeaListSort): T[] {
  const byNewest = (a: IdeaDto, b: IdeaDto) => b.createdAt.localeCompare(a.createdAt);
  const nullsLast = (a: number | null, b: number | null) =>
    a === null ? (b === null ? 0 : 1) : b === null ? -1 : a - b;

  const sorted = [...ideas];
  switch (sort) {
    case "old":
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "cheap":
      return sorted.sort((a, b) => nullsLast(a.costMinor, b.costMinor) || byNewest(a, b));
    case "short":
      return sorted.sort((a, b) => nullsLast(a.durationMinutes, b.durationMinutes) || byNewest(a, b));
    default:
      return sorted.sort(byNewest);
  }
}

export type ReactionWithNameDto = {
  userId: string;
  displayName: string;
  preference: "yes" | "maybe" | "no" | null;
};

export type IdeaDetailDto = IdeaDto & {
  isMatch: boolean;
  activePlanId: string | null;
  reactions: ReactionWithNameDto[];
};

// getIdea — קריאה בלבד. isMatch מחושב דרך list_my_matches (RPC שכבר גרנטד
// ל-authenticated ב-0002_rls.sql) כי own_reaction_read חוסם קריאת תגובת
// בן/בת הזוג ישירות — זו בדיוק הסיבה ש-list_my_matches קיימת כ-RPC נפרדת.
// reactions (24.9, שינוי מאושר לעיצוב הפרטיות המקורי) — שתי התגובות
// (עם שם) דרך get_idea_reactions (0014), RPC יעודית מאותה סיבה בדיוק.
// activePlanId — תוכנית proposed קיימת לרעיון הזה, אם יש (one_active_plan_per_idea);
// ה-UI מציג "תכננו את זה" רק כשאין כזו, ומקשר לקיימת אחרת (F6).
export async function getIdea(ideaId: string): Promise<IdeaDetailDto | null> {
  const supabase = await createSupabaseServerClient();

  const { data: idea } = await supabase
    .from("ideas")
    .select(
      "id, space_id, title, description, category, location_text, source_url, cost_minor, duration_minutes, created_at, status, version",
    )
    .eq("id", ideaId)
    .maybeSingle<IdeaRow & { space_id: string }>();
  if (!idea) return null;

  const [{ data: reaction }, { data: matchIds }, { data: activePlan }, { data: reactionsWithNames }] =
    await Promise.all([
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
      supabase.rpc("get_idea_reactions", { p_idea_id: ideaId }),
    ]);

  const isMatch = Array.isArray(matchIds)
    ? matchIds.some((m: { idea_id: string }) => m.idea_id === ideaId)
    : false;

  const reactions: ReactionWithNameDto[] = Array.isArray(reactionsWithNames)
    ? (reactionsWithNames as { user_id: string; display_name: string; preference: "yes" | "maybe" | "no" | null }[]).map(
        (r) => ({ userId: r.user_id, displayName: r.display_name, preference: r.preference }),
      )
    : [];

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
    reactions,
    status: idea.status as IdeaStatus,
    version: idea.version,
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

// updateIdea — RPC שירות (update_idea, 0015_update_idea_rpc.sql).
// expectedVersion (concurrency, אותו דפוס כמו archive/restore) — לא
// idempotency key: זו עדכון-במקום, וניסיון חוזר עם גרסה ישנה נכשל
// ב-VERSION_CONFLICT (ראו הערת המיגרציה).
export async function updateIdea(input: UpdateIdeaInput): Promise<Result<{ id: string; version: number }>> {
  const traceId = crypto.randomUUID();

  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("update_idea", {
    p_actor: userId,
    p_id: input.ideaId,
    p_expected_version: input.expectedVersion,
    p_title: input.title,
    p_description: input.description ?? "",
    p_category: input.category ?? "other",
    p_location_text: input.locationText ?? null,
    p_source_url: input.sourceUrl ?? null,
    p_cost_minor: input.costMinor ?? null,
    p_duration_minutes: input.durationMinutes ?? null,
  });

  if (error || !data) {
    if (error?.message?.includes("INVALID_INPUT")) {
      return fail("INVALID_INPUT", "כותרת חסרה או לא תקינה", traceId);
    }
    return mapIdeaRpcError(error?.message, "שמירת השינויים נכשלה, נסו שוב", traceId);
  }

  const idea = data as { id: string; version: number };
  return ok({ id: idea.id, version: idea.version }, traceId);
}

function mapIdeaRpcError(errorMessage: string | undefined, fallback: string, traceId: string): Result<never> {
  if (errorMessage?.includes("NOT_FOUND")) {
    return fail("NOT_FOUND", "הרעיון הזה כבר לא זמין", traceId);
  }
  if (errorMessage?.includes("ACTIVE_PLAN_EXISTS")) {
    return fail(
      "VERSION_CONFLICT",
      "אי אפשר להעביר לארכיון רעיון עם תוכנית פעילה — בטלו או השלימו אותה קודם",
      traceId,
    );
  }
  if (errorMessage?.includes("VERSION_CONFLICT")) {
    return fail("VERSION_CONFLICT", "הרעיון השתנה בינתיים — רעננו ונסו שוב", traceId);
  }
  return fail("UNEXPECTED", fallback, traceId);
}

// archiveIdea/restoreIdea — RPC שירות (0010_idea_archive_rpcs.sql). ארכוב
// חסום כל עוד יש תוכנית proposed לרעיון (ACTIVE_PLAN_EXISTS). בלי מחיקה
// פיזית — status בלבד (spec סעיף 6.1, 13.2).
export async function archiveIdea(ideaId: string, expectedVersion: number): Promise<Result<{ version: number }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("archive_idea", {
    p_actor: userId,
    p_id: ideaId,
    p_expected_version: expectedVersion,
  });

  if (error || !data) {
    return mapIdeaRpcError(error?.message, "העברה לארכיון נכשלה, נסו שוב", traceId);
  }
  return ok({ version: (data as { version: number }).version }, traceId);
}

export async function restoreIdea(ideaId: string, expectedVersion: number): Promise<Result<{ version: number }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("restore_idea", {
    p_actor: userId,
    p_id: ideaId,
    p_expected_version: expectedVersion,
  });

  if (error || !data) {
    return mapIdeaRpcError(error?.message, "שחזור מהארכיון נכשל, נסו שוב", traceId);
  }
  return ok({ version: (data as { version: number }).version }, traceId);
}
