import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendPayload, type PushTarget } from "@/lib/push";

// התראות מתוזמנות — רצות מהמשימה היומית (וגם תזכורת הגיבוי החודשית, למטה) (app/api/cron/daily), בבוקר:
//   "מחר ב-19:30: פיקניק בטבע"        — יום לפני תוכנית
//   "פיקניק בטבע היה אתמול. שומרים?"  — למחרת תוכנית שעוד לא נסגרה
// לשני בני הזוג. כל אחת פעם אחת בלבד (claim_push, 0024); תזכורת תלויה גם
// בשעה, כך שתוכנית שהוזזה ליום אחר תקבל תזכורת חדשה.

type Due = { kind: "reminder" | "how_was"; plan_id: string; title: string; starts_at: string; targets: PushTarget[] };

function timeIL(iso: string) {
  return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export async function sendPlanNotifications(): Promise<number> {
  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("due_plan_notifications");
  if (error) throw new Error("due_plan_notifications failed");

  let sent = 0;
  for (const d of (data as Due[] | null) ?? []) {
    if (d.targets.length === 0) continue;
    const key = d.kind === "reminder" ? `reminder:${d.plan_id}:${d.starts_at}` : `how_was:${d.plan_id}`;
    const { data: first } = await service.rpc("claim_push", { p_key: key.slice(0, 200) });
    if (first !== true) continue;

    const payload =
      d.kind === "reminder"
        ? { title: `מחר ב-${timeIL(d.starts_at)}`, body: d.title, url: `/plans/${d.plan_id}`, tag: `plan-${d.plan_id}` }
        : {
            title: "איך היה?",
            body: `${d.title} היה אתמול. שומרים כזיכרון?`,
            url: `/plans/${d.plan_id}?complete=1`,
            tag: `plan-${d.plan_id}`,
          };
    await sendPayload(d.targets, payload);
    sent++;
  }
  return sent;
}

// תזכורת גיבוי חודשית (0026): ב-1 בכל חודש (שעון ישראל), לשני בני הזוג,
// רק במרחב שיש בו לפחות זיכרון אחד. פעם אחת לחודש (claim_push).
export async function sendBackupReminders(now = new Date()): Promise<number> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now); // YYYY-MM-DD
  if (!today.endsWith("-01")) return 0;
  const month = today.slice(0, 7);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("backup_reminder_targets");
  if (error) throw new Error("backup_reminder_targets failed");

  let sent = 0;
  for (const s of (data as { space_id: string; memories: number; targets: PushTarget[] }[] | null) ?? []) {
    if (s.targets.length === 0) continue;
    const { data: first } = await service.rpc("claim_push", { p_key: `backup:${s.space_id}:${month}` });
    if (first !== true) continue;
    await sendPayload(s.targets, {
      title: "גיבוי חודשי",
      body: `${s.memories === 1 ? "זיכרון אחד" : `${s.memories} זיכרונות`} — שווה לשמור עותק. הגדרות ← גיבוי`,
      url: "/settings#export",
      tag: "backup",
    });
    sent++;
  }
  return sent;
}
