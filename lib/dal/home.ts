import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { MemoryDto } from "@/lib/dal/memories";
import type { UnreadConversation } from "@/lib/dal/conversations";
import type { IdeaCategory } from "@/lib/validation/idea";

export type HomeSummary = {
  displayName: string;
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
    navPlace: string | null;
    navPlaceId: string | null;
  } | null;
  partnerNewIdeas: PartnerNewIdea[];
  partnerNewIdeasTotal: number;
  pastPlans: PastPlan[];
};

export type PastPlan = {
  id: string;
  title: string;
  startsAt: string | null;
  meetingPlace: string | null;
  ideaCategory: IdeaCategory | null;
};

export type PartnerNewIdea = {
  id: string;
  title: string;
  category: IdeaCategory;
  createdAt: string;
};

export type HomeDashboard = HomeSummary & {
  unread: UnreadConversation[];
};

// שלוש קריאות RPC מקבילות מחליפות את שרשרת קריאות ה-Data API שהייתה במסך
// הבית. כל פונקציה מאמתת חברות במרחב פתוח בתוך המסד ומחזירה DTO מוכן לתצוגה.
export async function getHome(userId: string): Promise<HomeDashboard | null> {
  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("home_summary", { p_actor: userId });
  if (error) throw new Error(`HOME_SUMMARY: ${error.message}`);
  return data ? (data as unknown as HomeDashboard) : null;
}

export async function getLatestHomeMemory(userId: string): Promise<MemoryDto | null> {
  const service = createSupabaseServiceClient();
  const { data } = await service.rpc("home_latest_memory", { p_actor: userId });
  return data ? (data as unknown as MemoryDto) : null;
}

export async function getHomeOnThisDay(
  userId: string,
  today: string,
): Promise<{ memory: MemoryDto; label: string } | null> {
  const service = createSupabaseServiceClient();
  const { data } = await service.rpc("home_on_this_day", { p_actor: userId, p_today: today });
  return data ? (data as unknown as { memory: MemoryDto; label: string }) : null;
}
