import "server-only";

import { cache } from "react";
import { z } from "zod";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// רגע המאצ' (0030, 26.9): מסך חגיגה מלא — פעם אחת לכל אחד מבני הזוג.
// מי שהשלים את המאצ' רואה אותו מיד (setReactionAction), בן/בת הזוג — בפתיחה
// או ברענון הבאים של האפליקציה, בכל מסך ((app)/layout).

export type MatchItem = { id: string; title: string };
export type MatchCelebrationState = { me: string; partner: string; unseen: MatchItem[] };

const itemsSchema = z.array(z.object({ id: z.string().uuid(), title: z.string() }));

export const getMatchCelebrationState = cache(async (): Promise<MatchCelebrationState | null> => {
  const userId = await getVerifiedUserId();
  if (!userId) return null;
  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("match_celebration_state", { p_actor: userId });
  if (error || !data) return null;
  const raw = data as { me?: string | null; partner?: string | null; unseen?: unknown };
  const unseen = itemsSchema.safeParse(raw.unseen ?? []);
  return {
    me: raw.me?.trim() ?? "",
    partner: raw.partner?.trim() ?? "",
    unseen: unseen.success ? unseen.data : [],
  };
});

// מחזיר את מה שסומן עכשיו (ריק אם כבר נחגג, או שזה לא מאצ').
export async function markMatchesSeen(ideaIds: string[]): Promise<MatchItem[]> {
  const userId = await getVerifiedUserId();
  if (!userId || ideaIds.length === 0) return [];
  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("mark_matches_seen", { p_actor: userId, p_idea_ids: ideaIds });
  if (error) return [];
  const parsed = itemsSchema.safeParse(data ?? []);
  return parsed.success ? parsed.data : [];
}
