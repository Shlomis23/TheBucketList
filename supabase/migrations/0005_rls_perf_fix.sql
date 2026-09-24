-- ==========================================================================
-- 0005_rls_perf_fix.sql
--
-- תוצר של Supabase advisors (get_advisors, קטגוריית PERFORMANCE) שהורץ
-- אחרי 0001-0004 על הפרויקט האמיתי. auth.uid() בתוך own_reaction_read
-- הוערך מחדש per-row; עטיפה ב-(select auth.uid()) גורמת ל-planner לחשב
-- אותו פעם אחת לשאילתה. אין שינוי בהתנהגות או בהרשאות — רק ביצועים.
--
-- ממצאי advisors נוספים שנבדקו ולא תוקנו בכוונה:
--   - RLS Enabled No Policy על private.invitations/mutation_keys/audit_events:
--     זה בדיוק המצב הרצוי (סעיף 10.2) — הטבלאות האלה נגישות רק ל-service_role
--     שעוקף RLS ממילא; אין policy כי אין ללקוחות מה לקרוא שם.
--   - Signed-In Users Can Execute SECURITY DEFINER על public.list_my_matches:
--     מכוון (סעיף 10.2) — הפונקציה בודקת private.is_member(p_space) בעצמה
--     ומחזירה רק idea_id של מאצ'ים, לא reactions גולמיות.
--   - Unindexed foreign keys (16) ו-Unused index (7): נדחים בכוונה עד צורך
--     מוכח (סעיף 12: "להוסיף אינדקס חיפוש רק לפי צורך מוכח") — האפליקציה
--     משרתת שני משתמשים, לא עומס.
-- ==========================================================================

drop policy own_reaction_read on public.idea_reactions;
create policy own_reaction_read on public.idea_reactions for select to authenticated
  using (user_id = (select auth.uid()) and private.is_member(space_id));
