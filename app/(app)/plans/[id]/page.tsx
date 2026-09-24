import { notFound } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getPlan } from "@/lib/dal/plans";
import { PlanDetail } from "./PlanDetail";

// תוכנית `/plans/[id]` — F6, spec סעיף 6, 7.
// member_read RLS דואג שרק חברי המרחב יראו את השורה בכלל; getPlan מחזיר
// null גם עבור "לא קיים" וגם "שייך למרחב אחר" — 404 זהה (כמו ב-/ideas/[id]).
export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [plan, userId] = await Promise.all([getPlan(id), getVerifiedUserId()]);
  if (!plan || !userId) notFound();

  return (
    <div className="page">
      <PlanDetail plan={plan} />
    </div>
  );
}
