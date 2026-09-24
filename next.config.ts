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
        source: "/api/invitations/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
