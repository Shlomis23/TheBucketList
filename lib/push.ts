import "server-only";

import webpush from "web-push";
import { after } from "next/server";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// התראות לטלפון של בן/בת הזוג (Web Push, 0022). נקרא מ-Server Actions אחרי
// פעולה מוצלחת; השליחה עצמה ב-after() — אחרי שהתשובה כבר חזרה למשתמש, כך
// שהתראה איטית/נכשלת לא מאטה ולא מפילה שום פעולה.
//
// הנוסח בלי מגדר ("רעיון חדש מנועה", לא "נועה הוסיפה") ועם כותרת הפריט —
// מופיע גם במסך הנעילה, לכן בלי תוכן הודעות ארוך.

export type PushEvent =
  | { kind: "idea_created"; ideaId: string }
  | { kind: "comment_added"; ideaId: string; body: string }
  | { kind: "plan_created"; planId: string }
  | { kind: "plan_updated"; planId: string }
  | { kind: "plan_confirmed"; planId: string }
  | { kind: "memory_created"; memoryId: string }
  | { kind: "photos_added"; memoryId: string; count: number }
  | { kind: "space_closed" };

type Context = {
  spaceStatus: string;
  actorName: string | null;
  ideaTitle: string | null;
  planTitle: string | null;
  planConfirmedByBoth: boolean;
  targets: { endpoint: string; p256dh: string; auth: string }[];
};

type Payload = { title: string; body: string; url: string; tag: string };

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
    case "comment_added":
      if (!c.ideaTitle) return null;
      return {
        title: `הודעה ${from} · ${clip(c.ideaTitle, 40)}`,
        body: clip(e.body, 120),
        url: `/ideas/${e.ideaId}`,
        tag: `comment-${e.ideaId}`,
      };
    case "plan_created":
      if (!c.planTitle) return null;
      return { title: `תוכנית חדשה ${from}`, body: `${c.planTitle} — מחכה לאישור שלך`, url: `/plans/${e.planId}`, tag: `plan-${e.planId}` };
    case "plan_updated":
      if (!c.planTitle) return null;
      return { title: `עדכון ${from}`, body: `"${c.planTitle}" השתנתה — צריך לאשר שוב`, url: `/plans/${e.planId}`, tag: `plan-${e.planId}` };
    case "plan_confirmed":
      if (!c.planTitle) return null;
      return c.planConfirmedByBoth
        ? { title: "יש תוכנית!", body: `"${c.planTitle}" מאושרת לשניכם`, url: `/plans/${e.planId}`, tag: `plan-${e.planId}` }
        : { title: `אישור ${from}`, body: `"${c.planTitle}" — מחכה לאישור שלך`, url: `/plans/${e.planId}`, tag: `plan-${e.planId}` };
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

async function send(actorId: string, event: PushEvent) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  const service = createSupabaseServiceClient();
  const args: Record<string, string> = { p_actor: actorId };
  if ("ideaId" in event) args.p_idea_id = event.ideaId;
  if ("planId" in event) args.p_plan_id = event.planId;
  if ("memoryId" in event) args.p_memory_id = event.memoryId;
  const { data } = await service.rpc("push_context", args);
  const context = data as Context | null;
  if (!context || context.targets.length === 0) return;
  if (context.spaceStatus !== "open" && event.kind !== "space_closed") return;

  const payload = buildPayload(event, context);
  if (!payload) return;

  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://the-bucket-list-seven.vercel.app", publicKey, privateKey);
  await Promise.all(
    context.targets.map(async (t) => {
      try {
        await webpush.sendNotification(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24, urgency: event.kind === "space_closed" ? "high" : "normal", timeout: 8_000 },
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
