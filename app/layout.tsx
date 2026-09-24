import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

// Rubik — גופן עגול וחברותי עם תמיכת עברית מלאה, לפי כיוון העיצוב שנבחר.
const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-rubik",
  display: "swap",
});

// כותרת tab ו-Open Graph כלליים בלבד — אין לחשוף כותרת רעיון/זיכרון פרטיים
// בכל metadata גלובלי או ברמת דף. ראו docs/.../spec סעיף 4.
export const metadata: Metadata = {
  title: "The Bucket List",
  description: "רשימת חוויות משותפת לשני בני זוג",
  robots: { index: false, follow: false },
  // "הוספה למסך הבית" באייפון: פתיחה במסך מלא בלי שורת הכתובת, ושם קצר
  // מתחת לאייקון ("The Bucket List" נחתך במסך הבית). האייקון עצמו מגיע
  // מ-app/apple-icon.png. statusBarStyle "default" ולא "black-translucent":
  // לא כל המסכים מוסיפים ריווח safe-area-top, ותוכן היה נכנס מתחת לשעון.
  appleWebApp: {
    capable: true,
    title: "Bucket List",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // safe-area לתמיכה ב-iOS notch
  // צבע שורת הסטטוס/הכתובת = רקע האפליקציה, לפי מצב בהיר/כהה (globals.css).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8ff" },
    { media: "(prefers-color-scheme: dark)", color: "#17122b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body>{children}</body>
    </html>
  );
}
