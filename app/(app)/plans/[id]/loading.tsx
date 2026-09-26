// שלד טעינה ל-`/plans/[id]` — אותה גיאומטריה כמו PlanDetail.tsx. כשנכנסים
// מהרשימה או מהבית, החלק העליון (איור, סטטוס, שם, מועד) כבר ידוע ומוצג מיד
// (components/DetailSkeletons, lib/nav/preview).
import { PlanSkeleton } from "@/components/DetailSkeletons";

export default function Loading() {
  return <PlanSkeleton />;
}
