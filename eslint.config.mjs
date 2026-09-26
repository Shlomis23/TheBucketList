import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // ארגומנטים/משתנים שמתחילים ב-_ הם placeholders מכוונים
    // (למשל handlers שעדיין לא מומשו, params לא בשימוש עדיין).
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // שכבת עיצוב אחידה (26.9): גודל טקסט, מרווחים וצבע — רק דרך מחלקות
    // (app/styles/utilities.css, טוקנים ב-tokens.css), לא style={{...}} עם ערך
    // קבוע. ערך מחושב (תנאי/משתנה) מותר.
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    ignores: ["app/global-error.tsx"], // מסך בלי ה-CSS של האפליקציה
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name='style'] Property[key.name=/^(fontSize|fontWeight|margin|marginTop|marginBottom|gap|rowGap|columnGap|color|lineHeight)$/][value.type='Literal']",
          message: "עיצוב דרך מחלקות (text-sm, mb-12, gap-8, c-muted...) — ראו app/styles/utilities.css",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
