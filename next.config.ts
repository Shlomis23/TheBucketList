import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Referrer-Policy: no-referrer על מסך ההזמנה ומסלול ה-exchange שלו —
  // spec סעיף 11.2 ("הגנת הזמנות"). אין להדליף את ה-URL (וממנו את ה-#token
  // שכבר נוקה, אבל גם /invite/continue לא אמור לדלוף) ל-Referer של אתר יעד.
  async headers() {
    return [
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
