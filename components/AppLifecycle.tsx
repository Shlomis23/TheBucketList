"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { savePushSubscriptionAction } from "@/app/(app)/settings/push-actions";
import { refreshAllAction } from "@/app/(app)/lifecycle-actions";

// שני תיקונים ל"האפליקציה באייפון לא מתעדכנת ולא מקבלת התראות" (25.9):
//
// 1. רענון כשחוזרים לאפליקציה. אפליקציה במסך הבית באייפון לא נטענת מחדש
//    כשחוזרים אליה — היא ממשיכה בדיוק מאיפה שהייתה, עם הנתונים הישנים, עד
//    סגירה מלאה. כאן: חזרה לאפליקציה אחרי 5+ שניות ברקע, או כשהרשת חוזרת ->
//    refreshAllAction (מנקה את כל הלשוניות השמורות בטלפון ומביא את המסך
//    הנוכחי מעודכן, בלי לאבד מה שמוקלד בטפסים). וכל 90 שניות כשהמסך פתוח ->
//    router.refresh() למסך הנוכחי (שאר הלשוניות פגות לבד תוך 30-60 שניות).
//
// 2. סנכרון ההרשמה להתראות. הדפדפן זוכר שהמכשיר רשום, אבל השרת יכול "לשכוח"
//    (איפוס נתונים, מחיקת חשבון, כניסה עם חשבון אחר באותו מכשיר) — ואז מסך
//    ההגדרות מראה "פעילות" והשרת לא שולח לאף אחד. כאן: בכל פתיחה, אם יש
//    הרשמה בדפדפן והרשאה — שומרים אותה שוב בשרת (upsert, אידמפוטנטי).
const REFRESH_AFTER_HIDDEN_MS = 5_000;
const REFRESH_EVERY_MS = 90_000;
const PUSH_RESYNC_MS = 6 * 60 * 60 * 1000;

let lastPushSync = 0;

async function syncPushSubscription() {
  if (Date.now() - lastPushSync < PUSH_RESYNC_MS) return;
  if (!("serviceWorker" in navigator) || !("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const result = await savePushSubscriptionAction(sub.toJSON());
  if (result.ok) lastPushSync = Date.now();
}

export function AppLifecycle() {
  const router = useRouter();

  useEffect(() => {
    let hiddenAt = 0;
    const refresh = () => router.refresh();
    const refreshAll = () => {
      refreshAllAction().catch(refresh);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt >= REFRESH_AFTER_HIDDEN_MS) refreshAll();
      hiddenAt = 0;
      void syncPushSubscription().catch(() => {});
    };
    // iOS לפעמים מחזיר את הדף מה-bfcache בלי visibilitychange.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) refreshAll();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", refreshAll);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_EVERY_MS);

    void syncPushSubscription().catch(() => {});

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", refreshAll);
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}
