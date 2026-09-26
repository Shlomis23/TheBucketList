"use client";

import { useLayoutEffect, useRef } from "react";

// מעבר חלק בכניסה למסך (26.9, גרסה 2). הגרסה הראשונה (React ViewTransition)
// לא נראתה בפועל: מסך שנטען מהשרת מגיע אחרי שלד הטעינה, והאנימציה רצה על
// השלד ולא על התוכן. כאן — אנימציית CSS רגילה ברגע שהמסך עצמו עולה (אחרי
// השלד), בכל דפדפן. הכיוון נקבע ב-NavMemory ברגע הלחיצה (data-nav על <html>):
//   forward — נכנסים לפריט: מחליק פנימה משמאל (כמו באייפון בעברית)
//   back    — חוזרים: מחליק פנימה מימין
//   tab     — לשונית אחרת: דהייה קצרה
// טעינה ראשונה / רענון — בלי אנימציה. kind נשמר לתאימות (לא בשימוש).
export function PageTransition({ children }: { kind?: "list" | "detail"; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const nav = root.getAttribute("data-nav");
    const at = Number(root.getAttribute("data-nav-at") ?? 0);
    root.removeAttribute("data-nav"); // נצרך — מסך אחד מקבל אנימציה אחת
    // עד 4 שניות מהלחיצה (כולל טעינה); מעבר ישן יותר — בלי אנימציה.
    if (!nav || Date.now() - at > 4000) return;
    ref.current?.setAttribute("data-enter", nav);
  }, []);
  return (
    <div ref={ref} className="page-anim">
      {children}
    </div>
  );
}
