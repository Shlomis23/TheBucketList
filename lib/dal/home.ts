import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  ideasCount: number;
  matchesCount: number;
  waitingForPartner: boolean;
  upcomingPlan: {
    id: string;
    title: string;
    startsAt: string | null;
    meetingPlace: string | null;
  } | null;
};

export async function getHome(spaceId: string, userId: string): Promise<HomeSummary> {
  const supabase = await createSupabaseServerClient();

  const [profileRes, membersRes, ideasRes, matchesRes, planRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("space_members")
      .select("user_id", { count: "exact", head: true })
      .eq("space_id", spaceId),
    supabase
      .from("ideas")
      .select("id", { count: "exact", head: true })
      .eq("space_id", spaceId)
      .eq("status", "active"),
    supabase.rpc("list_my_matches", { p_space: spaceId }),
    supabase
      .from("plans")
      .select("id, title, starts_at, meeting_place")
      .eq("space_id", spaceId)
      .eq("status", "proposed")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const plan = planRes.data as
    | { id: string; title: string; starts_at: string | null; meeting_place: string | null }
    | null;

  return {
    displayName: (profileRes.data?.display_name as string | undefined) ?? "",
    ideasCount: ideasRes.count ?? 0,
    matchesCount: Array.isArray(matchesRes.data) ? matchesRes.data.length : 0,
    waitingForPartner: (membersRes.count ?? 1) < 2,
    upcomingPlan: plan
      ? {
          id: plan.id,
          title: plan.title,
          startsAt: plan.starts_at,
          meetingPlace: plan.meeting_place,
        }
      : null,
  };
}
