"use server";

import { z } from "zod";
import { markMatchesSeen } from "@/lib/dal/matches";

// נקרא ממסך החגיגה כשהוא מוצג לבן/בת הזוג — כדי שלא יופיע שוב.
export async function markMatchesSeenAction(ideaIds: unknown): Promise<void> {
  const parsed = z.array(z.string().uuid()).max(50).safeParse(ideaIds);
  if (!parsed.success) return;
  await markMatchesSeen(parsed.data);
}
