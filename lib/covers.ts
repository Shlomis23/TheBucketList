import type { IdeaCategory } from "@/lib/validation/idea";

// תמונות עיצוב (לא תמונות פרטיות שהמשתמשים מעלים — ראו spec סעיף 11.3:
// "תמונות זיכרון בלבד ב-MVP, ללא תמונות פרופיל או תמונות רעיון"). אלה
// SVG מקוריים, קבועים לקטגוריה, יושבים תחת public/images/covers — בלי
// DB, בלי Storage, בלי RLS. אם בעתיד ירצו תמונות אמיתיות לרעיון, זה
// שינוי scope נפרד (ראו דיון "דרך B") ולא הרחבה של הקובץ הזה.
export const categoryCoverImages: Record<IdeaCategory, string> = {
  food: "/images/covers/food.svg",
  outdoors: "/images/covers/outdoors.svg",
  culture: "/images/covers/culture.svg",
  trip: "/images/covers/trip.svg",
  home: "/images/covers/home.svg",
  learning: "/images/covers/learning.svg",
  other: "/images/covers/other.svg",
};

export function getIdeaCoverImage(category: IdeaCategory): string {
  return categoryCoverImages[category] ?? categoryCoverImages.other;
}

export const loginHeroImage = "/images/covers/hero-login.svg";
