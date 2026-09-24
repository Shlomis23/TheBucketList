import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { IdeaCategory } from "@/lib/validation/idea";

// getHome — קריאה בלבד, דרך client עם JWT המשתמש ו-RLS (member_read /
// own_reaction_read / list_my_matches). ראו spec סעיף 13.3:
// תוכנית קרובה, מספר מאצ'ים, מספר רעיונות, מצב המתנה לבן זוג.
//
// TODO (F2/F3 בהמשך): ברגע שיש listIdeas אמיתי, אפשר להחליף את ideasCount
// בתצוגה מקדימה של "רעיונות אחרונים" בפועל, לא רק מספר. גם טיפול שגיאה
// לפי אזור (שלד + retry נפרד לכל בלוק, ולא ליפול הכל יחד) נשאר TODO —
// כרגע שאילתה שנכשלת מוחזרת כ-0/null בלי לקרוס את שאר המסך.

export type HomeSummary = {
  displayName: string;
  // שם התצוגה של בן/בת הזוג (null אם עוד לא הצטרפו או שאין שם) — ל"חדש מ[שם]".
  partnerName: string | null;
  ideasCount: number;
  matchesCount: number;
  waitingForPartner: boolean;
  upcomingPlan: {
    id: string;
    title: string;
    startsAt: string | null;
    meetingPlace: string | null;
    ideaCategory: IdeaCategory | null;
  } | null;
  // רעיונות פעילים שבן/בת הזוג הוסיפו ואני עוד לא הגבתי עליהם בכלל (כן/אולי/לא
  // כולם נחשבים תשובה). partnerNewIdeas = עד PARTNER_NEW_IDEAS_LIMIT החדשים
  // ביותר; partnerNewIdeasTotal = כמה יש סך הכל (לקישור "ועוד X").
  partnerNewIdeas: PartnerNewIdea[];
  partnerNewIdeasTotal: number;
};

export type PartnerNewIdea = {
  id: string;
  title: string;
  category: IdeaCategory;
  createdAt: string;
};

const PARTNER_NEW_IDEAS_LIMIT = 3;

export async function getHome(spaceId: string, userId: string): Promise<HomeSummary> {
  const supabase = await createSupabaseServerClient();

  const [profileRes, membersRes, ideasRes, matchesRes, planRes, partnerIdeasRes, myReactionsRes] = await Promise.all([
    // בלי eq על id: RLS (profiles_read -> private.can_read_profile) מחזיר רק
    // את הפרופיל שלי ושל בן/בת הזוג במרחב פתוח — כך השם של שנינו מגיע באותה
    // שאילתה, בלי קפיצת רשת נוספת בשביל "חדש מ[שם]".
    supabase.from("profiles").select("id, display_name").returns<{ id: string; display_name: string }[]>(),
    supabase.from("space_members").select("user_id").eq("space_id", spaceId).returns<{ user_id: string }[]>(),
    supabase
      .from("ideas")
      .select("id", { count: "exact", head: true })
      .eq("space_id", spaceId)
      .eq("status", "active"),
    supabase.rpc("list_my_matches", { p_space: spaceId }),
    supabase
      .from("plans")
      .select("id, idea_id, title, starts_at, meeting_place")
      .eq("space_id", spaceId)
      .eq("status", "proposed")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    // "חדש מבן/בת הזוג": כל הרעיונות הפעילים שלא אני יצרתי + התגובות שלי
    // בלבד (own_reaction_read — לא נוגעים בתגובות של בן/בת הזוג), והסינון
    // נעשה כאן. בקנה המידה של זוג אחד זה קטן, ושתי השאילתות רצות במקביל
    // לשאר ה-Promise.all, אז אין קפיצת רשת נוספת.
    supabase
      .from("ideas")
      .select("id, title, category, created_at")
      .eq("space_id", spaceId)
      .eq("status", "active")
      .neq("created_by", userId)
      .order("created_at", { ascending: false })
      .returns<{ id: string; title: string; category: IdeaCategory; created_at: string }[]>(),
    supabase
      .from("idea_reactions")
      .select("idea_id")
      .eq("space_id", spaceId)
      .eq("user_id", userId)
      .returns<{ idea_id: string }[]>(),
  ]);

  const profiles = profileRes.data ?? [];
  const members = membersRes.data ?? [];
  const partnerId = members.find((m) => m.user_id !== userId)?.user_id ?? null;

  const reactedIds = new Set((myReactionsRes.data ?? []).map((r) => r.idea_id));
  const partnerUnanswered = (partnerIdeasRes.data ?? []).filter((i) => !reactedIds.has(i.id));

  const plan = planRes.data as
    | { id: string; idea_id: string; title: string; starts_at: string | null; meeting_place: string | null }
    | null;

  // תמונת עטיפה לכרטיס "התוכנית הקרובה" — לפי קטגוריית הרעיון המקושר
  // (lib/covers.ts). שאילתה נוספת קטנה, רק כשיש תוכנית קרובה בכלל.
  let ideaCategory: IdeaCategory | null = null;
  if (plan) {
    const { data: idea } = await supabase
      .from("ideas")
      .select("category")
      .eq("id", plan.idea_id)
      .maybeSingle<{ category: IdeaCategory }>();
    ideaCategory = idea?.category ?? null;
  }

  return {
    displayName: profiles.find((p) => p.id === userId)?.display_name ?? "",
    partnerName: partnerId ? (profiles.find((p) => p.id === partnerId)?.display_name?.trim() || null) : null,
    ideasCount: ideasRes.count ?? 0,
    matchesCount: Array.isArray(matchesRes.data) ? matchesRes.data.length : 0,
    waitingForPartner: members.length < 2,
    upcomingPlan: plan
      ? {
          id: plan.id,
          title: plan.title,
          startsAt: plan.starts_at,
          meetingPlace: plan.meeting_place,
          ideaCategory,
        }
      : null,
    partnerNewIdeas: partnerUnanswered.slice(0, PARTNER_NEW_IDEAS_LIMIT).map((i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      createdAt: i.created_at,
    })),
    partnerNewIdeasTotal: partnerUnanswered.length,
  };
}
