// ערכות צבע (26.9) — כל אחד בוחר לעצמו בהגדרות. הצבעים עצמם ב-app/styles/tokens.css
// (<html data-color="...">), איורי הקטגוריות ב-public/images/covers/<theme>/
// (scripts/generate-theme-covers.mjs). קובץ טהור — שרת ולקוח.

export const colorThemes = ["purple", "ocean", "turquoise", "mango"] as const;
export type ColorTheme = (typeof colorThemes)[number];
export const DEFAULT_THEME: ColorTheme = "purple";

// עוגייה (לא httpOnly): השרת צובע את הדף כבר בטעינה הראשונה, בלי הבזק סגול.
// מקור האמת — profiles.color_theme (0034), כדי שהבחירה תעבור בין מכשירים.
export const THEME_COOKIE = "bl-color";

export const themeInfo: Record<ColorTheme, { label: string; swatch: [string, string]; bg: { light: string; dark: string } }> = {
  purple: { label: "סגול דמדומים", swatch: ["#46307d", "#6a49b3"], bg: { light: "#faf8ff", dark: "#17122b" } },
  ocean: { label: "כחול ים", swatch: ["#1f4a85", "#3b78c9"], bg: { light: "#f6f9fe", dark: "#0e1728" } },
  turquoise: { label: "טורקיז", swatch: ["#075a5e", "#0fa3a8"], bg: { light: "#f4fcfc", dark: "#0a1b1c" } },
  mango: { label: "מנגו", swatch: ["#a04500", "#f08a1c"], bg: { light: "#fffaf3", dark: "#1f1305" } },
};

export function parseTheme(value: string | null | undefined): ColorTheme {
  return (colorThemes as readonly string[]).includes(value ?? "") ? (value as ColorTheme) : DEFAULT_THEME;
}

// איור הקטגוריה בערכה: proxy.ts משכתב /covers/<cat> לקובץ של הערכה לפי העוגייה.
export function themedCoverPath(theme: ColorTheme, file: string): string {
  return theme === DEFAULT_THEME ? `/images/covers/${file}` : `/images/covers/${theme}/${file}`;
}
