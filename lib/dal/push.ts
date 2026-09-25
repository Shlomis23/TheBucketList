import "server-only";

import { z } from "zod";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";

// הרשמה/ביטול של המכשיר הזה להתראות (0022).
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

export async function savePushSubscription(input: unknown, userAgent: string): Promise<Result<{ saved: true }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "המכשיר לא החזיר פרטי הרשמה תקינים", traceId);

  const service = createSupabaseServiceClient();
  const { error } = await service.rpc("save_push_subscription", {
    p_actor: userId,
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
    p_user_agent: userAgent.slice(0, 300),
  });
  if (error) return fail("UNEXPECTED", "הפעלת ההתראות נכשלה, נסו שוב", traceId);
  return ok({ saved: true }, traceId);
}

export async function deletePushSubscription(endpoint: unknown): Promise<Result<{ deleted: true }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);
  if (typeof endpoint !== "string" || endpoint.length > 1000) return fail("INVALID_INPUT", "בקשה לא תקינה", traceId);
  const service = createSupabaseServiceClient();
  await service.rpc("delete_push_subscription", { p_actor: userId, p_endpoint: endpoint });
  return ok({ deleted: true }, traceId);
}
