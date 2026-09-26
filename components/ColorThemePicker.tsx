"use client";

import { useState, useTransition } from "react";
import { setColorThemeAction } from "@/app/(app)/settings/actions";
import { colorThemes, themeInfo, type ColorTheme } from "@/lib/themes";
import { useTheme } from "@/components/ThemeProvider";

// בחירת צבע האפליקציה (26.9) — אישי לכל אחד. מחליפים מיד על המסך (כולל
// איורי הקטגוריות, דרך ThemeProvider) ושומרים בשרת. בלי טעינה מחדש.
export function ColorThemePicker({ current }: { current: ColorTheme }) {
  const { setTheme } = useTheme();
  const [selected, setSelected] = useState(current);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function choose(theme: ColorTheme) {
    if (theme === selected || pending) return;
    const prev = selected;
    setSelected(theme);
    setError("");
    setTheme(theme);
    startTransition(async () => {
      const result = await setColorThemeAction(theme);
      if (!result.ok) {
        setSelected(prev);
        setTheme(prev);
        setError(result.error.message);
      }
    });
  }

  return (
    <div>
      <div className="theme-picker" role="radiogroup" aria-label="צבע האפליקציה">
        {colorThemes.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={selected === t}
            className="theme-option"
            onClick={() => choose(t)}
            disabled={pending}
          >
            <span
              className="theme-swatch"
              aria-hidden="true"
              style={{ background: `linear-gradient(135deg, ${themeInfo[t].swatch[0]}, ${themeInfo[t].swatch[1]})` }}
            />
            <span className="theme-label">{themeInfo[t].label}</span>
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="alert-error mt-8">
          {error}
        </p>
      )}
    </div>
  );
}
