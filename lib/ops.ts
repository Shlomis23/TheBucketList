import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendPayload, type PushTarget } from "@/lib/push";

// דוח בריאות למשימה היומית (0033, 26.9). כל ריצה נשמרת ב-private.job_runs;
// אם משהו נכשל, או שהריצה הקודמת הייתה לפני יותר מ-36 שעות (יום שדילגנו
// עליו), נשלחת התראה למי שפתח את המרחב. פונקציה טהורה להחלטה — לבדיקות.

const GAP_HOURS = 36;

export function healthProblem(
  summary: { errors: string[]; purgeFailed: number },
  previousRunAt: string | null,
  now = new Date(),
): string | null {
  const problems: string[] = [];
  if (summary.purgeFailed > 0) problems.push(`מחיקת מרחב נכשלה (${summary.purgeFailed})`);
  if (summary.errors.length > 0) problems.push(summary.errors.slice(0, 2).join("; "));
  if (previousRunAt) {
    const hours = (now.getTime() - new Date(previousRunAt).getTime()) / 3_600_000;
    if (hours > GAP_HOURS) problems.push(`הריצה הקודמת הייתה לפני ${Math.round(hours / 24)} ימים`);
  }
  return problems.length ? problems.join(" · ") : null;
}

export async function recordDailyRun(summary: { errors: string[]; purgeFailed: number } & Record<string, unknown>) {
  const service = createSupabaseServiceClient();
  const ok = summary.errors.length === 0 && summary.purgeFailed === 0;
  const { data: previous, error } = await service.rpc("record_job_run", { p_job: "daily", p_ok: ok, p_summary: summary });
  if (error) console.error("record_job_run failed", error.message);

  const problem = healthProblem(summary, (previous as string | null) ?? null);
  if (!problem) return;
  const { data: targets } = await service.rpc("ops_alert_targets");
  await sendPayload((targets as PushTarget[] | null) ?? [], {
    title: "תקלה במשימה היומית",
    body: problem.slice(0, 160),
    url: "/settings",
    tag: "ops",
  });
}
