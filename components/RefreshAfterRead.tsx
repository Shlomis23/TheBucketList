"use client";

import { useEffect, useRef } from "react";
import { refreshAllAction } from "@/app/(app)/lifecycle-actions";

// נקרא בדף רעיון שהיו בו הודעות שלא נקראו (26.9). ההודעות סומנו כנקראו
// בשרת, אבל מסך הבית ורשימת הרעיונות שמורים בטלפון (staleTimes) עם
// "הודעה חדשה". refreshAllAction מנקה את המטמון — בחזרה לבית ההתראה כבר
// לא שם. רק כשבאמת היה משהו חדש, כדי לא לאבד את המטמון בכל כניסה לרעיון.
export function RefreshAfterRead() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void refreshAllAction().catch(() => {});
  }, []);
  return null;
}
