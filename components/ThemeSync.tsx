"use client";

import { useEffect } from "react";
import { syncThemeCookieAction } from "@/app/(app)/settings/actions";
import type { ColorTheme } from "@/lib/themes";

// הבחירה בפרופיל שונה מהעוגייה (מכשיר חדש, או שינוי ממכשיר אחר) — מעדכנים
// את העוגייה וטוענים מחדש פעם אחת, כדי שכל הדף והאיורים יהיו בצבע הנכון.
export function ThemeSync({ theme }: { theme: ColorTheme }) {
  useEffect(() => {
    void syncThemeCookieAction().then((t) => {
      if (t === theme) window.location.reload();
    });
  }, [theme]);
  return null;
}
