// שלד טעינה ל-`/ideas/[id]` — אותה גיאומטריה כמו app/(app)/ideas/[id]/page.tsx.
// כשנכנסים מהרשימה או מהבית, החלק העליון (איור, קטגוריה, שם) כבר ידוע ומוצג
// מיד (components/DetailSkeletons, lib/nav/preview).
import { IdeaSkeleton } from "@/components/DetailSkeletons";

export default function Loading() {
  return <IdeaSkeleton />;
}
