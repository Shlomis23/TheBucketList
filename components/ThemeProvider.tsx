"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DEFAULT_THEME, parseTheme, THEME_COOKIE, themeInfo, type ColorTheme } from "@/lib/themes";

function readCookie(name: string): string | undefined {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
}

// ערכת הצבע הנוכחית (26.9) לרכיבי לקוח — בעיקר CoverImg (איורי הקטגוריות).
// הערך ההתחלתי מגיע מהשרת (עוגייה, app/layout.tsx), כך שאין הבזק. setTheme
// מחליף מיד: <html data-color>, צבע שורת הסטטוס וכל האיורים — בלי טעינה מחדש.
type ThemeContextValue = { theme: ColorTheme; setTheme: (t: ColorTheme) => void };
const ThemeContext = createContext<ThemeContextValue>({ theme: DEFAULT_THEME, setTheme: () => {} });

function applyToDocument(theme: ColorTheme) {
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) root.removeAttribute("data-color");
  else root.setAttribute("data-color", theme);
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m) => {
    const dark = (m.getAttribute("media") ?? "").includes("dark");
    m.setAttribute("content", dark ? themeInfo[theme].bg.dark : themeInfo[theme].bg.light);
  });
}

export function ThemeProvider({ initialTheme, children }: { initialTheme: ColorTheme; children: React.ReactNode }) {
  const [theme, setThemeState] = useState(initialTheme);
  const themeRef = useRef(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  const setTheme = useCallback((t: ColorTheme) => {
    applyToDocument(t);
    setThemeState(t);
  }, []);

  // חזרה לדף ישן (כפתור "אחורה" — מזיכרון הדפדפן או מהמטמון שלו) או חזרה
  // לאפליקציה מהרקע: הדף משוחזר כמו שהיה, עם הצבע הקודם. העוגייה היא מקור
  // האמת — בודקים מולה בטעינה, בכל pageshow ובכל חזרה לחזית, ומיישרים.
  useEffect(() => {
    const resync = () => {
      const fromCookie = parseTheme(readCookie(THEME_COOKIE));
      if (fromCookie !== themeRef.current) setTheme(fromCookie);
    };
    const onPageShow = () => resync();
    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    resync();
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setTheme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
