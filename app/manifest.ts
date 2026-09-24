import type { MetadataRoute } from "next";

// PWA manifest — spec סעיף 12. אייקון מקורי (דלי עם לב, בצבעי המותג) בשתי
// גרסאות, כי אנדרואיד ואייפון חותכים אייקונים אחרת:
//   - "any" (icon-192/512): פינות מעוגלות ורקע שקוף — דסקטופ/דפדפנים ישנים.
//   - "maskable" (icon-maskable-192/512): רקע מלא עד הקצוות, והציור כולו
//     בתוך "האזור הבטוח" (עיגול 80% במרכז) — כך שכל צורה שהמשגר באנדרואיד
//     חותך (עיגול, squircle, ריבוע מעוגל) לא קוטעת את הדלי.
//   - אייפון לא קורא את האייקונים מכאן אלא מ-app/apple-icon.png (180px,
//     אטום, בלי פינות — iOS מעגל בעצמו). ראו גם appleWebApp ב-app/layout.tsx.
// צבעים: רקע וצבע ערכה = רקע האפליקציה (--color-bg), כך שמסך הפתיחה
// באנדרואיד ושורת הסטטוס נראים המשך טבעי של האפליקציה ולא פס צבע זר.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "The Bucket List",
    short_name: "Bucket List",
    description: "רשימת חוויות משותפת לשני בני זוג",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "he",
    dir: "rtl",
    background_color: "#faf8ff",
    theme_color: "#faf8ff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
