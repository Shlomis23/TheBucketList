import "server-only";

import { getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// "לא נקרא" בשיחות (0026). הודעה של בן/בת הזוג שנכתבה אחרי הפעם האחרונה
// שפתחתי את הרעיון = חדשה. פתיחת דף הרעיון מסמנת הכול כנקרא.

export type UnreadConversation = {
  ideaId: string;
  ideaTitle: string;
  unreadCount: number;
  lastAt: string;
  lastAuthor: string | null;
};

export async function getUnreadConversations(): Promise<UnreadConversation[]> {
  const userId = await getVerifiedUserId();
  if (!userId) return [];
  const service = createSupabaseServiceClient();
  const { data } = await service.rpc("unread_conversations", { p_actor: userId });
  return ((data as { idea_id: string; idea_title: string; unread_count: number; last_at: string; last_author: string | null }[] | null) ?? []).map(
    (r) => ({
      ideaId: r.idea_id,
      ideaTitle: r.idea_title,
      unreadCount: r.unread_count,
      lastAt: r.last_at,
      lastAuthor: r.last_author?.trim() || null,
    }),
  );
}

// נקרא מדף הרעיון בזמן הרינדור. כישלון לא מפיל את הדף — במקרה הגרוע הנקודה
// נשארת עד הכניסה הבאה.
export async function markIdeaRead(ideaId: string): Promise<void> {
  const userId = await getVerifiedUserId();
  if (!userId) return;
  const service = createSupabaseServiceClient();
  await service.rpc("mark_idea_read", { p_actor: userId, p_idea_id: ideaId });
}
