import { notFound, redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getPlan } from "@/lib/dal/plans";
import { getMemoryIdForPlan } from "@/lib/dal/memories";
import { PlanDetail } from "./PlanDetail";
import { PageTransition } from "@/components/PageTransition";

// תוכנית `/plans/[id]` — F6, spec סעיף 6, 7.
// member_read RLS דואג שרק חברי המרחב יראו את השורה בכלל; getPlan מחזיר
// null גם עבור "לא קיים" וגם "שייך למרחב אחר" — 404 זהה (כמו ב-/ideas/[id]).
export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ complete?: string }>;
}) {
  const [{ id }, { complete }] = await Promise.all([params, searchParams]);
  // getMemoryIdForPlan במקביל (בלי קפיצת רשת נוספת) — null אם התוכנית עוד
  // לא הושלמה; אחרת כפתור "לזיכרון".
  const [plan, userId, memoryId] = await Promise.all([getPlan(id), getVerifiedUserId(), getMemoryIdForPlan(id)]);
  // לא מחובר (קישור מהיומן נפתח ב-Safari) — דף נחיתה, לא "לא מצאנו".
  if (!userId) redirect(`/open?next=/plans/${id}`);
  if (!plan) notFound();

  return (
    <PageTransition kind="detail">
      <div className="page">
        {/* ?complete=1 — מכרטיס "איך היה?" בבית: פותח ישר את טופס ההשלמה. */}
        <PlanDetail
          plan={plan}
          memoryId={plan.status === "completed" ? memoryId : null}
          startCompleting={complete === "1" && plan.status === "proposed"}
        />
      </div>
    </PageTransition>
  );
}
