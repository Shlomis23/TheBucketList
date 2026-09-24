# Data Access Layer

כל קובץ בתיקייה הזו מתחיל ב-`import "server-only"`. זו השכבה היחידה שמותר
לה לקרוא ל-Supabase RPC/reads — Server Actions ו-Route Handlers קוראים ל-DAL,
לא ל-Supabase ישירות.

- reads: דרך client עם ה-JWT של המשתמש, נשענים על RLS (ראו migrations, סעיף 10.2).
- writes: אך ורק דרך RPC שירות צרות (סעיף 13.4) — אסור DML גנרי.

קיים כרגע: `profile.ts` (updateMyProfile), `space.ts` (createSpace,
getMySpaceId), `home.ts` (getHome — קריאה בלבד, ראו spec סעיף 13.3).
שאר הפונקציות (`listIdeas`, `createIdea`, `setReaction`, `createInvitation`
וכו') נכנסות בהמשך, יחד עם ה-RPC המתאימות ב-`supabase/migrations`.
