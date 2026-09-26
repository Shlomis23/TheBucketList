"use client";

import { useEffect } from "react";
import { syncThemeCookieAction } from "@/app/(app)/settings/actions";
import type { ColorTheme } from "@/lib/themes";
import { useTheme } from "@/components/ThemeProvider";

// הבחירה בפרופיל שונה מהעוגייה (מכשיר חדש, או שינוי ממכשיר אחר) — מעדכנים
// את העוגייה ומחליפים את הצבע על המסך (כולל האיורים), בלי טעינה מחדש.
export function ThemeSync({ theme }: { theme: ColorTheme }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    void syncThemeCookieAction().then((t) => {
      if (t) setTheme(t);
    });
  }, [theme, setTheme]);
  return null;
}
