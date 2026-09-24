# Data Access Layer

כל קובץ בתיקייה הזו מתחיל ב-`import "server-only"`. זו השכבה היחידה שמותר
לה לקרוא ל-Supabase RPC/reads — Server Actions ו-Route Handlers קוראים ל-DAL,
לא ל-Supabase ישירות.

- reads: דרך client עם ה-JWT של המשתמש, נשענים על RLS (ראו migrations, סעיף 10.2).
- writes: אך ורק דרך RPC שירות צרות (סעיף 13.4) — אסור DML גנרי.

קיים כרגע: `profile.ts` (getMyProfile — קריאה בלבד; updateMyProfile),
`space.ts` (createSpace, getMySpaceId, hasPartner — קריאה בלבד), `home.ts`
(getHome — קריאה בלבד), `ideas.ts` (listIdeas, getIdea — קריאה בלבד;
createIdea, setReaction, archiveIdea, restoreIdea — RPC שירות ב-
`0007_idea_rpcs.sql`/`0010_idea_archive_rpcs.sql`; ארכוב חסום כל עוד יש
תוכנית proposed לרעיון), `choose.ts` (chooseExperience — קריאה בלבד,
אלגוריתם סעיף 8), `plans.ts` (listPlans, getPlan — קריאה בלבד, כולל
אישורים ו-isConfirmedByBoth הנגזר; createPlan, updatePlan, confirmPlan,
unconfirmPlan, cancelPlan, completePlan — RPC שירות ב-`0009_plan_rpcs.sql`;
completePlan כותב גם שורת memories בטרנזקציה אחת, לקראת F7). completePlanAction
(app/(app)/plans/actions.ts) יכולה גם לארכב את הרעיון best-effort אחרי
השלמה מוצלחת, אם המשתמש סימן זאת בטופס.

`invitations.ts` (F1/F2, spec סעיף 10.3, 11.1, 11.2, 13.2, 13.3):
createInvitation (מייצר טוקן גולמי ב-Node/CSPRNG, שולח רק את ה-hash ל-RPC,
מחזיר את הקישור המלא פעם אחת בלבד — לעולם לא נשמר), revokeInvitation,
getInvitationStatus (קריאה בלבד, RPC בטוחה עם auth.uid() פנימי, email
מוסווה), acceptInvitation (עוטפת accept_invitation_internal הקיימת מ-
`0003_accept_invitation.sql`; token מגיע מה-cookie הזמני, לא מטופס). RPC
שירות נוספות ב-`0011_invitation_rpcs.sql`/`0012_fix_create_invitation_ambiguous_id.sql`,
כולל rate limiting DB-backed (public.check_rate_limit, לא זיכרון תהליך
בודד). cookie זמני חתום+מוצפן+HttpOnly דרך `lib/invitations/cookie.ts`
(AES-256-GCM, node:crypto — לא ספריית חוץ). זרימת המסכים: `/invite`
(consent + exchange) -> `/invite/continue` (כניסה אם צריך, שם אם עדיין
אין profile, ואז accept) -> `/`. ניהול בפועל תחת `/settings#invite`
(InvitationPanel).

שאר הפונקציות (חיפוש/פילטר מלא ב-listIdeas, addComment, memories UI מלא
וכו') נכנסות בהמשך.
