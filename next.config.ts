import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // מהירות (26.9): מסך שביקרו בו נשמר בטלפון 30 שניות, ולשונית שנטענה מראש
  // (BottomNav, prefetch מלא) — 60 שניות. מעבר בין לשוניות בלי לחכות לשרת.
  // כל פעולה (Server Action עם revalidatePath / עוגייה) מנקה את כל המטמון,
  // וחזרה מהרקע מנקה אותו דרך refreshAllAction (components/AppLifecycle.tsx).
  experimental: {
    staleTimes: { dynamic: 30, static: 60 },
  },
  // Referrer-Policy: no-referrer על מסך ההזמנה ומסלול ה-exchange שלו —
  // spec סעיף 11.2 ("הגנת הזמנות"). אין להדליף את ה-URL (וממנו את ה-#token
  // שכבר נוקה, אבל גם /invite/continue לא אמור לדלוף) ל-Referer של אתר יעד.
  async headers() {
    return [
      // כותרות אבטחה לכל האתר (27.9, סקירת OWASP — A02). ראשונות ברשימה:
      // כשכמה כללים מתאימים לאותה כתובת, האחרון גובר — כך שהכללים
      // הספציפיים למטה (הזמנות: no-referrer; sw.js: CSP מחמיר) נשארים.
      {
        source: "/:path*",
        headers: [
          // אסור להטמיע את האפליקציה בתוך אתר אחר (clickjacking — לחיצה
          // "מוסתרת" על כפתור כמו "מחיקת המרחב"). שתי הדרכים, לדפדפנים ישנים.
          { key: "X-Frame-Options", value: "DENY" },
          // CSP חלקי: רק הנחיות שלא יכולות לשבור כלום. script-src מלא דורש
          // nonce לכל דף (הסקריפטים של Next) — לא כאן.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // אין שימוש במיקום/מיקרופון/תשלומים — חוסמים גם לסקריפט זר.
          // (מצלמה לא: בחירת תמונה מהמצלמה עוברת דרך input רגיל.)
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), payment=(), usb=(), browsing-topics=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        source: "/invite/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        // Service Worker: תמיד הגרסה העדכנית (לא מהמטמון), ורק סקריפטים מהאתר.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        source: "/api/invitations/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
