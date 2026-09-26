// שלד טעינה ל-`/ideas/[id]` — אותה גיאומטריה כמו app/(app)/ideas/[id]/page.tsx.
// כשנכנסים מהרשימה, החלק העליון (איור, קטגוריה, שם) כבר ידוע ומוצג מיד
// (components/IdeaSkeleton, lib/nav/preview).
import { IdeaSkeleton } from "@/components/IdeaSkeleton";

export default function Loading() {
  return <IdeaSkeleton />;
}
