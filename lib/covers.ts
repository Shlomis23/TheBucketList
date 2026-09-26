import type { IdeaCategory } from "@/lib/validation/idea";

// תמונות עיצוב (לא תמונות פרטיות שהמשתמשים מעלים — ראו spec סעיף 11.3:
// "תמונות זיכרון בלבד ב-MVP, ללא תמונות פרופיל או תמונות רעיון"). אלה
// SVG מקוריים, קבועים לקטגוריה, יושבים תחת public/images/covers — בלי
// DB, בלי Storage, בלי RLS. אם בעתיד ירצו תמונות אמיתיות לרעיון, זה
// שינוי scope נפרד (ראו דיון "דרך B") ולא הרחבה של הקובץ הזה.
// /covers/<קטגוריה> — proxy.ts משכתב לקובץ בערכת הצבע של המשתמש (26.9),
// כך שכל <img> בכל מקום מקבל את האיור בצבעים הנכונים בלי לדעת מה הערכה.
export const categoryCoverImages: Record<IdeaCategory, string> = {
  food: "/covers/food",
  outdoors: "/covers/outdoors",
  culture: "/covers/culture",
  trip: "/covers/trip",
  home: "/covers/home",
  learning: "/covers/learning",
  other: "/covers/other",
};

export function getIdeaCoverImage(category: IdeaCategory): string {
  return categoryCoverImages[category] ?? categoryCoverImages.other;
}

export const loginHeroImage = "/images/covers/hero-login.svg";
