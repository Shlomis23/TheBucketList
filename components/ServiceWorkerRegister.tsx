"use client";

import { useEffect } from "react";

// רישום public/sw.js — מסך "אין אינטרנט" והתראות. רק ב-production: בפיתוח
// Service Worker שנשאר רשום מבלבל רענונים.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
