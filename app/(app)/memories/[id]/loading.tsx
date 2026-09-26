// שלד טעינה ל-`/memories/[id]` — באנר מקצה לקצה (MemoryHero) + כרטיס "איך היה".
// כשנכנסים מהאלבום או מהבית, הבאנר (תמונת שער, שם, תאריך) כבר ידוע ומוצג
// מיד (components/DetailSkeletons, lib/nav/preview).
import { MemorySkeleton } from "@/components/DetailSkeletons";

export default function Loading() {
  return <MemorySkeleton />;
}
