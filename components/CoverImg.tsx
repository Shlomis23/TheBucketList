"use client";

import { getIdeaCoverImage } from "@/lib/covers";
import type { IdeaCategory } from "@/lib/validation/idea";
import { useTheme } from "@/components/ThemeProvider";

// איור קטגוריה בערכת הצבע הנוכחית (26.9). כתובת שונה לכל ערכה — כך שהחלפת
// צבע מחליפה מיד את האיור, בלי תלות במטמון של הדפדפן.
export function CoverImg({ category, className }: { category: IdeaCategory; className?: string }) {
  const { theme } = useTheme();
  // eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי
  return <img src={getIdeaCoverImage(category, theme)} alt="" className={className} />;
}
