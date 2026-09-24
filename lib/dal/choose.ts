import "server-only";

import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId } from "@/lib/dal/space";
import { ok, fail, type Result } from "@/lib/errors/result";
import type { ChooseFilters } from "@/lib/validation/choose";
import type { IdeaCategory } from "@/lib/validation/idea";

// מנוע בחירת חוויה — קריאה בלבד, spec סעיף 8. כל הקריאות דרך client
// המשתמש + RLS: ב-scope=all אסור לקרוא תגובות פרטיות של בן/בת הזוג בכלל
// (לא רק לא לשקלל אותן) — לכן כשה-scope הוא all אנחנו אפילו לא נוגעים
// בטבלת idea_reactions. ב-matches נעזרים ב-list_my_matches (RPC שכבר
// גרנטד ל-authenticated) בדיוק כמו ב-getIdea, כי own_reaction_read חוסם
// קריאת תגובת האחר ישירות.
//
// אין יצירת תוכנית כאן (read-only, כמו שהאפיון דורש) — "בואו נתכנן את זה"
// ב-UI מוביל ל-/plans/new עם ideaId (F6, ראו app/(app)/plans/).

export type ChooseCandidate = {
  id: string;
  title: string;
  category: IdeaCategory;
  locationText: string | null;
  sourceUrl: string | null;
  costMinor: number | null;
  durationMinutes: number | null;
  reasons: string[];
};

type IdeaPoolRow = {
  id: string;
  title: string;
  category: string;
  location_text: string | null;
  source_url: string | null;
  cost_minor: number | null;
  duration_minutes: number | null;
  created_at: string;
};

const MS_PER_DAY = 86_400_000;

export async function chooseExperience(
  filters: ChooseFilters,
): Promise<Result<{ candidate: ChooseCandidate | null }>> {
  const traceId = crypto.randomUUID();

  // userId ו-spaceId לא תלויים זה בזה — במקביל במקום ברצף (ראו app/(app)/page.tsx).
  const [userId, spaceId] = await Promise.all([getVerifiedUserId(), getMySpaceId()]);
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);
  if (!spaceId) return fail("UNAUTHENTICATED", "אין עדיין מרחב פעיל", traceId);

  const supabase = await createSupabaseServerClient();

  // 1. רעיונות פעילים של המרחב בלבד (סעיף 8.2.1).
  const { data: pool } = await supabase
    .from("ideas")
    .select("id, title, category, location_text, source_url, cost_minor, duration_minutes, created_at")
    .eq("space_id", spaceId)
    .eq("status", "active")
    .returns<IdeaPoolRow[]>();
  let candidates = pool ?? [];

  // 2. scope=matches -> רק מאצ'ים אמיתיים (חישוב שרתי). scope=all -> כל
  // הפעילים, בלי לגעת בתגובות של אף אחד.
  if (filters.scope === "matches") {
    const { data: matchRows } = await supabase.rpc("list_my_matches", { p_space: spaceId });
    const matchIds = new Set(
      Array.isArray(matchRows) ? matchRows.map((m: { idea_id: string }) => m.idea_id) : [],
    );
    candidates = candidates.filter((c) => matchIds.has(c.id));
  }

  // 4. סינון רעיונות עם תוכנית proposed קיימת.
  const { data: proposedRows } = await supabase
    .from("plans")
    .select("idea_id")
    .eq("space_id", spaceId)
    .eq("status", "proposed")
    .returns<{ idea_id: string }[]>();
  const proposedIdeaIds = new Set((proposedRows ?? []).map((p) => p.idea_id));
  candidates = candidates.filter((c) => !proposedIdeaIds.has(c.id));

  // נתוני השלמה קודמת (להשלמת סעיף 8.2.5) — עדיין תמיד "מעולם לא הושלם"
  // כרגע כי completePlan (F6) לא קיים עדיין; הלוגיקה כאן נכונה גם כשהוא ייבנה.
  const { data: completedRows } = await supabase
    .from("plans")
    .select("idea_id, updated_at")
    .eq("space_id", spaceId)
    .eq("status", "completed")
    .returns<{ idea_id: string; updated_at: string }[]>();
  const lastCompletedByIdea = new Map<string, number>();
  for (const row of completedRows ?? []) {
    const t = new Date(row.updated_at).getTime();
    const prev = lastCompletedByIdea.get(row.idea_id);
    if (prev === undefined || t > prev) lastCompletedByIdea.set(row.idea_id, t);
  }

  // 3. סינון לפי תנאים. allowUnknown חל על כל שדה שערכו חסר אצל הרעיון.
  const now = Date.now();
  candidates = candidates.filter((c) => {
    if (filters.excludedIdeaIds.includes(c.id)) return false;
    if (filters.category && c.category !== filters.category) return false;

    if (filters.maxBudgetMinor !== undefined) {
      if (c.cost_minor === null) {
        if (!filters.allowUnknown) return false;
      } else if (c.cost_minor > filters.maxBudgetMinor) {
        return false;
      }
    }

    if (filters.maxDurationMinutes !== undefined) {
      if (c.duration_minutes === null) {
        if (!filters.allowUnknown) return false;
      } else if (c.duration_minutes > filters.maxDurationMinutes) {
        return false;
      }
    }

    if (filters.locationText && filters.locationText.trim() !== "") {
      if (c.location_text === null) {
        if (!filters.allowUnknown) return false;
      } else if (!c.location_text.toLowerCase().includes(filters.locationText.trim().toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  // 5-6. ניקוד וסדר, עם ID לשבירת שוויון יציבה.
  const scored = candidates
    .map((c) => {
      const lastCompleted = lastCompletedByIdea.get(c.id);
      const completionScore =
        lastCompleted === undefined
          ? 20
          : Math.min(Math.max(0, (now - lastCompleted) / MS_PER_DAY), 90) / 9;
      const daysSinceCreated = Math.max(0, (now - new Date(c.created_at).getTime()) / MS_PER_DAY);
      const freshnessScore = Math.min(daysSinceCreated, 30) / 3;
      return { idea: c, score: completionScore + freshnessScore, neverCompleted: lastCompleted === undefined };
    })
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.idea.id.localeCompare(b.idea.id)));

  const top = scored[0];
  if (!top) return ok({ candidate: null }, traceId);

  // 7. הסבר עובדתי — בלי הצגת התאמה לתקציב כשהעלות חסרה.
  const reasons: string[] = [];
  if (filters.maxBudgetMinor !== undefined && top.idea.cost_minor !== null) {
    reasons.push("בתקציב שהגדרתם");
  }
  if (top.neverCompleted) {
    reasons.push("עוד לא עשיתם את זה");
  }
  if (filters.maxDurationMinutes !== undefined && top.idea.duration_minutes === null) {
    reasons.push("משך לא ידוע");
  }
  if (filters.category && top.idea.category === filters.category) {
    reasons.push("מתאים לקטגוריה שבחרתם");
  }

  return ok(
    {
      candidate: {
        id: top.idea.id,
        title: top.idea.title,
        category: top.idea.category as IdeaCategory,
        locationText: top.idea.location_text,
        sourceUrl: top.idea.source_url,
        costMinor: top.idea.cost_minor,
        durationMinutes: top.idea.duration_minutes,
        reasons,
      },
    },
    traceId,
  );
}
