import { defineConfig } from "vitest/config";
import path from "node:path";

// בדיקות יחידה: לוגיקה טהורה (ניסוחים, תאריכים, קישורים, עיבוד תמונות).
// "server-only" מוחלף במודול ריק — בבדיקות אין גבול שרת/לקוח.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "tests/helpers/empty.ts"),
    },
  },
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // התאריכים בבדיקות נקבעים ידנית; אזור הזמן של המכונה לא משנה את התוצאה
    // (הקוד תמיד מפרמט ב-Asia/Jerusalem) — מלבד isoToParts שעובד לפי שעון
    // המכשיר, ולכן מקבעים כאן.
    env: { TZ: "Asia/Jerusalem" },
  },
});
