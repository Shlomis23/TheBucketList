import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

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

// iOS בלבד: maximum-scale=1 מבטל את הזום האוטומטי של Safari כשנוגעים בשדה
// (select/צ'יפים קטנים; שדות ההקלדה כבר 16px ב-globals.css). ב-iOS 10+ זה
// לא חוסם הגדלה ידנית בשתי אצבעות — Safari מתעלם מזה לצביטה, כך שאין פגיעה
// בנגישות. באנדרואיד אין זום אוטומטי כזה, ושם maximum-scale כן היה חוסם
// צביטה — לכן לא מוסיפים אותו שם (החלטה מ-25.9, "דרך א").
// headers() הופך את ה-layout לדינמי; כל הדפים כבר דינמיים (cookies/searchParams).
export async function generateViewport(): Promise<Viewport> {
  const ua = (await headers()).get("user-agent") ?? "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  return {
    width: "device-width",
    initialScale: 1,
    ...(isIOS ? { maximumScale: 1 } : {}),
    viewportFit: "cover", // safe-area לתמיכה ב-iOS notch
    // צבע שורת הסטטוס/הכתובת = רקע האפליקציה, לפי מצב בהיר/כהה (globals.css).
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#faf8ff" },
      { media: "(prefers-color-scheme: dark)", color: "#17122b" },
    ],
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
