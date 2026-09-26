import { formatPlanWhen } from "@/lib/validation/plan";

// ניסוחי ההתראות — קובץ נפרד ונקי (בלי שרת/רשת), כדי שאפשר לבדוק אותם
// בבדיקות יחידה (tests/unit/push-payload.test.ts). השליחה עצמה: lib/push.ts.
//
// הנוסח בלי מגדר ("רעיון חדש מנועה", לא "נועה הוסיפה") ועם כותרת הפריט —
// מופיע גם במסך הנעילה, לכן בלי תוכן הודעות ארוך.

export type PushEvent =
  | { kind: "idea_created"; ideaId: string }
  | { kind: "match"; ideaId: string }
  | { kind: "comment_added"; ideaId: string; body: string }
  | { kind: "plan_created"; planId: string }
  | { kind: "plan_updated"; planId: string }
  | { kind: "plan_cancelled"; planId: string }
  | { kind: "memory_created"; memoryId: string }
  | { kind: "photos_added"; memoryId: string; count: number }
  | { kind: "space_closed" };

export type PushContext = {
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

export function buildPayload(e: PushEvent, c: PushContext): Payload | null {
  const from = c.actorName?.trim() ? `מ${c.actorName.trim()}` : "מבן/בת הזוג";
  const who = c.actorName?.trim() || "בן/בת הזוג";
  switch (e.kind) {
    case "idea_created":
      if (!c.ideaTitle) return null;
      return { title: `רעיון חדש ${from}`, body: c.ideaTitle, url: `/ideas/review?first=${e.ideaId}`, tag: `idea-${e.ideaId}` };
    // מאצ' — לבן/בת הזוג. מי שענה "כן" עכשיו רואה מסך חגיגה באפליקציה (0030).
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
    // בלי שלב אישור (25.9): ההתראה אומרת מה ומתי — זה כל מה שצריך לדעת.
    case "plan_created":
      if (!c.planTitle) return null;
      return { title: `תוכנית חדשה ${from}`, body: `${c.planTitle} · ${formatPlanWhen(c.planStartsAt)}`, url: `/plans/${e.planId}`, tag: `plan-${e.planId}` };
    case "plan_updated":
      if (!c.planTitle) return null;
      return { title: `עדכון בתוכנית ${from}`, body: `${c.planTitle} · ${formatPlanWhen(c.planStartsAt)}`, url: `/plans/${e.planId}`, tag: `plan-${e.planId}` };
    case "plan_cancelled":
      if (!c.planTitle) return null;
      return { title: "תוכנית בוטלה", body: `${c.planTitle} · בוטלה ע״י ${who}`, url: `/plans/${e.planId}`, tag: `plan-${e.planId}` };
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

