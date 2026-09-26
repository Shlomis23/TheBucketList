import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import { cookies, headers } from "next/headers";
// עיצוב (26.9): טוקנים -> בסיס -> רכיבים -> מסכים -> מחלקות עזר. הסדר חשוב.
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/screens.css";
import "./styles/utilities.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ThemeProvider } from "@/components/ThemeProvider";
import { splashStartupImages } from "@/lib/pwa/splash";
import { DEFAULT_THEME, parseTheme, THEME_COOKIE, themeInfo } from "@/lib/themes";

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
  // startupImage: מסך פתיחה לכל גודל אייפון (lib/pwa/splash.ts) — בלי זה
  // פתיחה מהבית מתחילה בהבזק לבן.
  appleWebApp: {
    capable: true,
    title: "Bucket List",
    statusBarStyle: "default",
    startupImage: splashStartupImages,
  },
  // מאז Next 15, capable: true מפיק רק mobile-web-app-capable (התג של
  // אפל סומן כמיושן בכרום). אבל האייפון עדיין מציג את apple-touch-startup-image
  // רק כשהתג הישן קיים — בלעדיו יש מסך לבן בפתיחה (vercel/next.js#74524).
  other: { "apple-mobile-web-app-capable": "yes" },
};

// iOS בלבד: maximum-scale=1 מבטל את הזום האוטומטי של Safari כשנוגעים בשדה
// (select/צ'יפים קטנים; שדות ההקלדה כבר 16px ב-app/styles/components.css). ב-iOS 10+ זה
// לא חוסם הגדלה ידנית בשתי אצבעות — Safari מתעלם מזה לצביטה, כך שאין פגיעה
// בנגישות. באנדרואיד אין זום אוטומטי כזה, ושם maximum-scale כן היה חוסם
// צביטה — לכן לא מוסיפים אותו שם (החלטה מ-25.9, "דרך א").
// headers() הופך את ה-layout לדינמי; כל הדפים כבר דינמיים (cookies/searchParams).
export async function generateViewport(): Promise<Viewport> {
  const ua = (await headers()).get("user-agent") ?? "";
  const bg = themeInfo[parseTheme((await cookies()).get(THEME_COOKIE)?.value)].bg;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  return {
    width: "device-width",
    initialScale: 1,
    ...(isIOS ? { maximumScale: 1 } : {}),
    viewportFit: "cover", // safe-area לתמיכה ב-iOS notch
    // צבע שורת הסטטוס/הכתובת = רקע האפליקציה, לפי מצב בהיר/כהה וערכת הצבע.
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: bg.light },
      { media: "(prefers-color-scheme: dark)", color: bg.dark },
    ],
  };
}

const NAV_BACK_SCRIPT =
  'addEventListener("popstate",function(){var r=document.documentElement;r.setAttribute("data-nav","back");r.setAttribute("data-nav-at",String(Date.now()))},true)';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ערכת הצבע (26.9) מהעוגייה — הדף נצבע כבר בשרת, בלי הבזק של הסגול.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="he" dir="rtl" className={rubik.variable} data-color={theme === DEFAULT_THEME ? undefined : theme}>
      <head>
        {/* מעבר "חזרה" (26.9): React מסיים את הניווט של popstate באופן סינכרוני
            בתוך המאזין של Next — מאזין שנרשם אחריו (NavMemory) מסמן מאוחר מדי,
            והמסך כבר עלה בלי אנימציה. לכן נרשמים כאן, לפני ש-Next עולה.
            נצרך ע"י components/PageTransition. */}
        <script dangerouslySetInnerHTML={{ __html: NAV_BACK_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
