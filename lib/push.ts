import "server-only";

import webpush from "web-push";
import { after } from "next/server";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatPlanWhen } from "@/lib/validation/plan";

// התראות לטלפון של בן/בת הזוג (Web Push, 0022). נקרא מ-Server Actions אחרי
// פעולה מוצלחת; השליחה עצמה ב-after() — אחרי שהתשובה כבר חזרה למשתמש, כך
// שהתראה איטית/נכשלת לא מאטה ולא מפילה שום פעולה.
//
// הנוסח בלי מגדר ("רעיון חדש מנועה", לא "נועה הוסיפה") ועם כותרת הפריט —
// מופיע גם במסך הנעילה, לכן בלי תוכן הודעות ארוך.

export type PushEvent =
  | { kind: "idea_created"; ideaId: string }
  | { kind: "match"; ideaId: string }
  | { kind: "comment_added"; ideaId: string; body: string }
  | { kind: "plan_created"; planId: string }
  | { kind: "plan_updated"; planId: string }
  | { kind: "memory_created"; memoryId: string }
  | { kind: "photos_added"; memoryId: string; count: number }
  | { kind: "space_closed" };

type Context = {
  spaceStatus: string;
  actorName: string | null;
  ideaTitle: string | null;
  planTitle: string | null;
  planStartsAt: string | null;
  targets: PushTarget[];
};

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type Payload = { title: string; body: string; url: string; tag: string };

function clip(s: string, n: number) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function buildPayload(e: PushEvent, c: Context): Payload | null {
  const from = c.actorName?.trim() ? `מ${c.actorName.trim()}` : "מבן/בת הזוג";
  const who = c.actorName?.trim() || "בן/בת הזוג";
  switch (e.kind) {
    case "idea_created":
      if (!c.ideaTitle) return null;
      return { title: `רעיון חדש ${from}`, body: c.ideaTitle, url: `/ideas/${e.ideaId}`, tag: `idea-${e.ideaId}` };
    // מאצ' — לשניכם (גם למי שענה "כן" עכשיו): זה רגע משותף.
    case "match":
      if (!c.ideaTitle) return null;
      return { title: "יש מאצ'!", body: `שניכם רוצים: ${c.ideaTitle}`, url: `/ideas/${e.ideaId}`, tag: `match-${e.ideaId}` };
    case "comment_added":
      if (!c.ideaTitle) return null;
      return {
        title: `הודעה ${from} · ${clip(c.ideaTitle, 40)}`,
        body: clip(e.body, 120),
        url: `/ideas/${e.ideaId}`,
        tag: `comment-${e.ideaId}`,
      };
    // בלי שלב אישור (26.9): ההתראה אומרת מה ומתי — זה כל מה שצריך לדעת.
    case "plan_created":
      if (!c.planTitle) return null;
      return { title: `תוכנית חדשה ${from}`, body: `${c.planTitle} · ${formatPlanWhen(c.planStartsAt)}`, url: `/plans/${e.planId}`, tag: `plan-${e.planId}` };
    case "plan_updated":
      if (!c.planTitle) return null;
      return { title: `עדכון בתוכנית ${from}`, body: `${c.planTitle} · ${formatPlanWhen(c.planStartsAt)}`, url: `/plans/${e.planId}`, tag: `plan-${e.planId}` };
    case "memory_created":
      if (!c.planTitle) return null;
      return { title: `זיכרון חדש ${from}`, body: `${c.planTitle} — אפשר להוסיף תמונות ואיך היה`, url: `/memories/${e.memoryId}`, tag: `memory-${e.memoryId}` };
    case "photos_added":
      if (!c.planTitle) return null;
      return {
        title: e.count === 1 ? `תמונה חדשה ${from}` : `${e.count} תמונות חדשות ${from}`,
        body: c.planTitle,
        url: `/memories/${e.memoryId}`,
        tag: `photos-${e.memoryId}`,
      };
    case "space_closed":
      return { title: `המרחב נסגר ע״י ${who}`, body: "אפשר להוריד את הזיכרונות עד המחיקה.", url: "/space-closed", tag: "space-closed" };
  }
}

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
  if (event.kind === "match") args.p_include_actor = true;
  const { data } = await service.rpc("push_context", args);
  const context = data as Context | null;
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
