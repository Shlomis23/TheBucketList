import type { PlanStatus } from "@/lib/dal/plans";

// באדג' הסטטוס בראש דף התוכנית — משותף ל-PlanDetail ולשלד הטעינה שלו
// (components/DetailSkeletons), כדי שיהיו זהים.
// בלי שלב אישור (25.9): תוכנית שנוצרה = סגורה. מסמנים רק מה שחסר.
export function PlanStatusBadge({ status, startsAt }: { status: PlanStatus; startsAt: string | null }) {
  if (status === "cancelled") return <span className="badge badge-neutral">בוטלה</span>;
  if (status === "completed") return <span className="badge badge-green">בוצע</span>;
  if (!startsAt) return <span className="badge badge-yellow">מועד לא נקבע</span>;
  return null;
}
