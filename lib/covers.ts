import type { IdeaCategory } from "@/lib/validation/idea";
import { DEFAULT_THEME, themedCoverPath, type ColorTheme } from "@/lib/themes";

// תמונות עיצוב (לא תמונות פרטיות שהמשתמשים מעלים — ראו spec סעיף 11.3:
// "תמונות זיכרון בלבד ב-MVP, ללא תמונות פרופיל או תמונות רעיון"). אלה
// SVG מקוריים, קבועים לקטגוריה, יושבים תחת public/images/covers — בלי
// DB, בלי Storage, בלי RLS. אם בעתיד ירצו תמונות אמיתיות לרעיון, זה
// שינוי scope נפרד (ראו דיון "דרך B") ולא הרחבה של הקובץ הזה.
// איור לכל קטגוריה, בערכת הצבע (26.9): הסגול ב-/images/covers, השאר
// ב-/images/covers/<theme> (scripts/generate-theme-covers.mjs). ברכיבים — CoverImg.
export function getIdeaCoverImage(category: IdeaCategory, theme: ColorTheme = DEFAULT_THEME): string {
  const file = `${IDEA_COVER_FILES.includes(category) ? category : "other"}.svg`;
  return themedCoverPath(theme, file);
}

const IDEA_COVER_FILES: readonly string[] = ["food", "outdoors", "culture", "trip", "home", "learning", "other"];

export const loginHeroImage = "/images/covers/hero-login.svg";
