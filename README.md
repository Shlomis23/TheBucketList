# The Bucket List

אפליקציית PWA פרטית לשני בני זוג שאינם גרים יחד: שומרים רעיונות, מסמנים
רצון אישי, מגלים מאצ'ים, בוחרים חוויה, מתכננים אותה ושומרים זיכרונות.

המסמך המחייב לכל החלטת מוצר/ארכיטקטורה/אבטחה הוא
[`docs/The-Bucket-List-Technical-Spec-HE.md`](./docs/The-Bucket-List-Technical-Spec-HE.md).
תוכנית הביצוע לפי שלבים נמצאת ב-
[`docs/The-Bucket-List-Action-Plan-HE.md`](./docs/The-Bucket-List-Action-Plan-HE.md).

## מצב נוכחי

**שלב 0 (יסודות) — בתהליך.** מה שקיים כרגע: שלד Next.js App Router +
TypeScript strict, מבנה תיקיות לפי סעיף 9.2 באפיון, migrations כטיוטה
(סעיף 10) שעדיין **לא הורצו** מול Supabase אמיתי, ו-stub pages לכל המסכים
מסעיף 6 בלי לוגיקה עסקית. אין עדיין Auth עובד, RLS מאומת בפועל, או RPC
כתיבה מעבר לזה שכבר מפורט באפיון (`accept_invitation_internal`).

**אל תניחו שמשהו כאן "עובד" רק כי הקובץ קיים** — ראו TODO בכל קובץ.

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # למלא NEXT_PUBLIC_SUPABASE_URL/ANON_KEY מפרויקט Supabase אמיתי
npm run dev
```

בדיקות סטטיות לפני כל commit:

```bash
npm run typecheck
npm run lint
npm run build
```

## Supabase

1. ליצור פרויקט חדש ב-[supabase.com](https://supabase.com) (בחינם).
2. להריץ את המיגרציות תחת `supabase/migrations/` **בסדר המספור** מול DB
   מקומי/staging — לא production ישירות. הן טיוטה שלא נבדקה בהרצה
   (ראו header בכל קובץ).
3. Project URL ו-anon/publishable key הולכים ל-`.env.local`.
   **Service role key אף פעם לא נכנס ל-`.env.local` הזה ולא ל-repo** — רק
   ל-Environment Variables של סביבת ה-deploy (Vercel).

## פריסה

Vercel, מחובר ל-repo הזה על ענף `main`. Deploy אוטומטי על כל push — לוודא
שמשתני הסביבה בפרויקט ה-Vercel מוגדרים לפני ה-deploy הראשון שאמור לעבוד
בפועל.

## מבנה

ראו סעיף 9.2 באפיון. בקצרה: `app/` מסכים ו-Route Handlers,
`lib/{auth,dal,validation,errors,rate-limit,supabase}/` שכבת שרת,
`features/` רכיבים לפי דומיין, `supabase/migrations` סכמה ו-RLS,
`tests/{unit,integration,e2e}` בדיקות.
