"use client";

import { useRouter } from "next/navigation";
import { goBack } from "@/lib/nav/memory";

// כפתור חזרה עגול (26.9) — אותו עיצוב כמו בדף זיכרון (.mhero-back).
// חוזר למסך הקודם באפליקציה (מדלג על טפסים), לנקודה שבה עצרנו לגלול;
// בלי מסך קודם (נכנסו מהתראה) — לרשימה של האזור.
// overlay: מעל תמונת הכותרת (בתוך .hero-wrap). inline: כשאין תמונה.
export function BackButton({
  fallback,
  className = "hero-back",
}: {
  fallback: "/" | "/ideas" | "/plans" | "/memories";
  className?: string;
}) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => goBack(router, fallback)} aria-label="חזרה">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
