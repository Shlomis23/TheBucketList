"use client";

import { useLayoutEffect, useRef } from "react";

// מעבר חלק בכניסה למסך (26.9, גרסה 2). הגרסה הראשונה (React ViewTransition)
// לא נראתה בפועל: מסך שנטען מהשרת מגיע אחרי שלד הטעינה, והאנימציה רצה על
// השלד ולא על התוכן. כאן — אנימציית CSS רגילה ברגע שהמסך עולה, בכל דפדפן.
// הכיוון נקבע ב-NavMemory ברגע הלחיצה (data-nav על <html>):
//   forward — נכנסים לפריט: מחליק פנימה משמאל (כמו באייפון בעברית)
//   back    — חוזרים: מחליק פנימה מימין
//   tab     — לשונית אחרת: דהייה קצרה
// טעינה ראשונה / רענון — בלי אנימציה. kind נשמר לתאימות (לא בשימוש).
//
// שלד טעינה (27.9): כשהמסך עוד לא בטלפון, השלד (loading.tsx, skeleton) עולה
// ראשון ומקבל את ההחלקה — כך יש תנועה מיד בלחיצה. הוא משאיר "מסירה" למה
// שיחליף אותו:
//   - אם ההחלקה עוד באמצע (שלד שני, או תוכן שהגיע מהר) — ממשיכים אותה מאותה
//     נקודה (animation-delay שלילי), בלי קפיצה ובלי להתחיל מחדש.
//   - אחרת: settle (התייצבות קלה) אחרי שלד רגיל, או none אחרי שלד שכבר הציג
//     את הרעיון עצמו (lib/nav/preview) — שם החלק העליון זהה, ואסור שיהבהב.
type Handoff = "settle" | "none";
const WINDOW_MS = 4000;
const ANIM_MS = 300; // הארוכה מבין האנימציות (screens.css) + מרווח

export function PageTransition({
  skeleton,
  children,
}: {
  kind?: "list" | "detail";
  skeleton?: Handoff;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ran = useRef(false); // StrictMode (פיתוח) מריץ פעמיים — רק הראשונה
  useLayoutEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const root = document.documentElement;
    const now = Date.now();
    const nav = root.getAttribute("data-nav");
    const at = Number(root.getAttribute("data-nav-at") ?? 0);
    root.removeAttribute("data-nav"); // נצרך — מסך אחד מקבל אנימציה אחת
    if (!nav || now - at > WINDOW_MS) return;

    // איזו אנימציה, ומאיזו נקודה בה.
    let anim: string | null = null;
    let animStart = now;
    if (nav === "forward" || nav === "back" || nav === "tab") {
      anim = nav;
    } else {
      const prev = root.getAttribute("data-nav-anim");
      const prevStart = Number(root.getAttribute("data-nav-anim-at") ?? 0);
      if (prev && now - prevStart < ANIM_MS) {
        anim = prev; // ממשיכים את ההחלקה של השלד הקודם
        animStart = prevStart;
      } else if (nav === "settle") {
        anim = "settle";
      }
    }
    const el = ref.current;
    if (el && anim) {
      if (animStart < now) el.style.animationDelay = `-${now - animStart}ms`;
      el.setAttribute("data-enter", anim);
    }

    // שלד — משאיר לתוכן הבא איך להיכנס.
    if (skeleton) {
      root.setAttribute("data-nav", skeleton);
      root.setAttribute("data-nav-at", String(now));
      if (anim && anim !== "settle") {
        root.setAttribute("data-nav-anim", anim);
        root.setAttribute("data-nav-anim-at", String(animStart));
      } else {
        root.removeAttribute("data-nav-anim");
      }
    }
  }, [skeleton]);
  return (
    <div ref={ref} className="page-anim">
      {children}
    </div>
  );
}
