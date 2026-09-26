"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ENTRY_KEY,
  freezeSaving,
  isListPath,
  newEntryId,
  recordNavigation,
  saveScroll,
  setNavDirection,
  unfreezeSaving,
} from "@/lib/nav/memory";

// שומר את מיקום הגלילה בכל רשימה ומחזיר אותו בחזרה אליה (26.9) — מכפתור
// החזרה, מלחיצה על הלשונית מתוך רעיון, ומ"אחורה" של אנדרואיד.
// ראו lib/nav/memory.ts. יושב ב-(app)/layout, כך שהוא חי לאורך כל הניווט.
const currentUrl = () => window.location.pathname + window.location.search;

// מחכה שהתוכן ייטען (מהמטמון זה מיידי; אחרת אחרי שלד הטעינה) ומגלול
// למקום. עוצר אם המשתמש נוגע במסך או אחרי 2.5 שניות.
function restoreScroll(y: number) {
  const started = performance.now();
  let raf = 0;
  const stop = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("wheel", stop);
    unfreezeSaving();
  };
  window.addEventListener("touchstart", stop, { passive: true, once: true });
  window.addEventListener("wheel", stop, { passive: true, once: true });
  const step = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.min(y, Math.max(0, max)));
    if (max >= y || performance.now() - started > 2500) return stop();
    raf = requestAnimationFrame(step);
  };
  step();
}

export function NavMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // הדפדפן לא ישחזר גלילה בעצמו — אנחנו עושים את זה (ראו למעלה).
  useEffect(() => {
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        saveScroll(currentUrl(), window.scrollY);
      });
    };
    // מעבר מסך מתחיל: מפסיקים לשמור (הדף הבא מחליף את התוכן והגלילה).
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href === currentUrl()) return;
      freezeSaving();
      // כיוון המעבר לאנימציית הכניסה (PageTransition): ניווט תחתון/רשימה —
      // דהייה; פריט — פנימה.
      setNavDirection(a.closest("nav.bottom-nav") || isListPath(href.split("?")[0]) ? "tab" : "forward");
    };
    // הכיוון "back" מסומן ב-app/layout.tsx (סקריפט שנרשם לפני Next) — כאן
    // זה כבר מאוחר מדי, והסימון היה "דולף" לניווט הבא.
    const onPopState = () => freezeSaving();
    // מזהה לכל רשומת היסטוריה: push מקבל מזהה חדש, replace שומר את המזהה של
    // הרשומה הנוכחית. Next (ו-MemoriesBrowser) קוראים ל-history ישירות, לכן
    // עוטפים; מוסיפים שדה אחד ל-state ומעבירים הלאה בלי לשנות התנהגות.
    const history = window.history;
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    const stamp = (data: unknown, id: unknown) =>
      data && typeof data === "object" ? { ...(data as object), [ENTRY_KEY]: id } : { [ENTRY_KEY]: id };
    history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
      return origPush.call(this, stamp(data, newEntryId()), unused, url);
    };
    history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
      const current = (history.state as Record<string, unknown> | null)?.[ENTRY_KEY];
      return origReplace.call(this, current ? stamp(data, current) : data, unused, url);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState, true);
    return () => {
      window.history.scrollRestoration = prev;
      history.pushState = origPush;
      history.replaceState = origReplace;
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
    };
  }, []);

  // useLayoutEffect: הגלילה למקום קורית לפני שהמסך מצויר — בלי הבהוב של
  // ראש הרשימה. NavMemory מרונדר אחרי התוכן, כך שזה רץ אחרי הגלילה של Next.
  useLayoutEffect(() => {
    const entryId = (window.history.state as Record<string, unknown> | null)?.[ENTRY_KEY];
    const { restoreTo } = recordNavigation(currentUrl(), typeof entryId === "string" ? entryId : null);
    if (restoreTo !== null) restoreScroll(restoreTo);
    else requestAnimationFrame(unfreezeSaving);
  }, [pathname, searchParams]);

  return null;
}
