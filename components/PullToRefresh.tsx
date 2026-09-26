"use client";

import { useEffect, useRef, useState } from "react";
import { refreshAllAction } from "@/app/(app)/lifecycle-actions";

// משיכה לרענון (26.9). באפליקציה ממסך הבית אין "רענון" של דפדפן — משיכה
// למטה כשהמסך בראש מביאה את המצב העדכני (שינוי של בן/בת הזוג) בלי לצאת
// ולחזור. refreshAllAction: מנקה את כל המסכים השמורים ומרענן את הנוכחי.
// לא פועל מעל מסכים מלאים (סבב, מאצ', צפייה בתמונה) ובתוך שדות קלט.
const THRESHOLD = 72; // פיקסלים של משיכה (אחרי ההאטה) עד שמרעננים
const MAX = 110;
const BLOCKING = ".review, .match-overlay, .viewer";

export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const state = useRef({ startY: null as number | null, pull: 0, busy: false });

  useEffect(() => {
    const s = state.current;
    const blocked = (target: EventTarget | null) =>
      Boolean(document.querySelector(BLOCKING)) ||
      document.body.style.overflow === "hidden" ||
      Boolean((target as Element | null)?.closest?.("input, textarea, select, [contenteditable], .mhero-scroller"));

    const onStart = (e: TouchEvent) => {
      s.startY = null;
      if (s.busy || e.touches.length !== 1 || window.scrollY > 0 || blocked(e.target)) return;
      s.startY = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (s.startY === null) return;
      const dy = e.touches[0].clientY - s.startY;
      if (dy <= 0 || window.scrollY > 0) {
        if (s.pull) setPull((s.pull = 0));
        return;
      }
      setPull((s.pull = Math.min(MAX, dy * 0.5)));
    };
    const onEnd = () => {
      if (s.startY === null) return;
      s.startY = null;
      if (s.pull < THRESHOLD) {
        setPull((s.pull = 0));
        return;
      }
      s.busy = true;
      setRefreshing(true);
      setPull((s.pull = THRESHOLD));
      refreshAllAction()
        .catch(() => {})
        .finally(() => {
          s.busy = false;
          setRefreshing(false);
          setPull((s.pull = 0));
        });
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (pull === 0 && !refreshing) return null;
  const ready = pull >= THRESHOLD;
  return (
    <div
      className={`ptr${ready ? " is-ready" : ""}${refreshing ? " is-refreshing" : ""}`}
      style={{ transform: `translate(-50%, ${pull - 44}px)`, opacity: Math.min(1, pull / THRESHOLD) }}
      role="status"
      aria-live="polite"
      aria-label={refreshing ? "מרענן" : ready ? "שחררו לרענון" : "משכו לרענון"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
      >
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v5h-5" />
      </svg>
    </div>
  );
}
