import "server-only";

import webpush from "web-push";
import { after } from "next/server";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { buildPayload, type Payload, type PushContext, type PushEvent, type PushTarget } from "@/lib/push-payload";

export type { PushEvent, PushTarget, Payload };

// התראות לטלפון של בן/בת הזוג (Web Push, 0022). נקרא מ-Server Actions אחרי
// פעולה מוצלחת; השליחה עצמה ב-after() — אחרי שהתשובה כבר חזרה למשתמש, כך
// שהתראה איטית/נכשלת לא מאטה ולא מפילה שום פעולה. הניסוחים: lib/push-payload.ts.

function vapidReady() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://the-bucket-list-seven.vercel.app", publicKey, privateKey);
  return true;
}

// שליחה ישירה לרשימת מכשירים — משמש גם את המשימה היומית (תזכורות).
export async function sendPayload(targets: PushTarget[], payload: Payload, urgency: "normal" | "high" = "normal") {
  if (targets.length === 0 || !vapidReady()) return;
  const service = createSupabaseServiceClient();
  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24, urgency, timeout: 8_000 },
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // המכשיר ביטל הרשמה / האפליקציה נמחקה — מנקים.
        if (status === 404 || status === 410) {
          await service.rpc("remove_dead_push_subscription", { p_endpoint: t.endpoint });
        } else {
          console.error("push failed", status ?? "network");
        }
      }
    }),
  );
}

async function send(actorId: string, event: PushEvent) {
  const service = createSupabaseServiceClient();
  const args: Record<string, string | boolean> = { p_actor: actorId };
  if ("ideaId" in event) args.p_idea_id = event.ideaId;
  if ("planId" in event) args.p_plan_id = event.planId;
  if ("memoryId" in event) args.p_memory_id = event.memoryId;
  const { data } = await service.rpc("push_context", args);
  const context = data as PushContext | null;
  if (!context || context.targets.length === 0) return;
  if (context.spaceStatus !== "open" && event.kind !== "space_closed") return;

  const payload = buildPayload(event, context);
  if (!payload) return;
  // מאצ' פעם אחת לכל רעיון — גם אם מישהו מחליף "כן"->"לא"->"כן".
  if (event.kind === "match") {
    const { data: first } = await service.rpc("claim_push", { p_key: `match:${event.ideaId}` });
    if (first !== true) return;
  }
  await sendPayload(context.targets, payload, event.kind === "space_closed" ? "high" : "normal");
}

// לקרוא אחרי פעולה מוצלחת. actorId אופציונלי (אם כבר ידוע); אחרת מה-session.
export function notifyPartner(event: PushEvent, actorId?: string) {
  after(async () => {
    try {
      const id = actorId ?? (await getVerifiedUserId());
      if (id) await send(id, event);
    } catch (e) {
      console.error("notifyPartner error", e instanceof Error ? e.message : "unknown");
    }
  });
}
