-- ==========================================================================
-- supabase/tests/authorization.sql — בדיקות הרשאה לכל ה-RPC (spec 14.2 #4)
--
-- איך מריצים: להדביק ב-SQL Editor של Supabase (או psql). הכול רץ בטרנזקציה
-- אחת שמתבטלת בסוף — שום נתון אמיתי לא משתנה. התוצאה היא תמיד "שגיאה":
--   ALL PASS (N checks)          — הכול תקין
--   FAILED k/N: <פירוט>          — משהו נפתח שלא היה אמור
--
-- התרחיש: שני מרחבים מזויפים בתוך הטרנזקציה —
--   מרחב 1: A (יוצר) + B (בן/בת זוג)      מרחב 2: C (זר)
-- ובודקים ש-C לא יכול לגעת בשום דבר של מרחב 1, ש-B לא יכול לעשות את מה
-- שרק A רשאי (מחיקת תמונה של A, ביטול סגירה של A), ושאף פונקציית שירות
-- לא פתוחה ל-anon/authenticated.
-- ==========================================================================
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid();
  idea public.ideas; plan_id uuid; mem_id uuid; photo_id uuid; comment_id uuid;
  checks int := 0; failures text[] := '{}'; r record; v jsonb;
begin
  -- ---------- fixture ----------
  insert into auth.users (id, email, aud, role) values
    (a, 'authz-a@test.invalid', 'authenticated', 'authenticated'),
    (b, 'authz-b@test.invalid', 'authenticated', 'authenticated'),
    (c, 'authz-c@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (id, display_name) values (a, 'A'), (b, 'B'), (c, 'C');
  insert into public.spaces (id, status, timezone) values (s1, 'open', 'Asia/Jerusalem'), (s2, 'open', 'Asia/Jerusalem');
  insert into public.space_members (space_id, user_id, slot) values (s1, a, 1), (s1, b, 2), (s2, c, 1);

  idea := public.create_idea(a, gen_random_uuid(), 'רעיון של A', '', 'other', null, null, null, null, null, true);
  comment_id := (public.add_comment(a, gen_random_uuid(), idea.id, 'הודעה של A')).id;
  plan_id := (public.create_plan(a, gen_random_uuid(), idea.id, now() - interval '2 days', null, 'Asia/Jerusalem', null, '', null)).id;
  select public.complete_plan(a, gen_random_uuid(), plan_id, 1, current_date - 1, 'סיפור') into mem_id;
  photo_id := public.create_photo_upload(a, gen_random_uuid(), mem_id, 'image/jpeg', 1000);
  perform public.finalize_photo(a, photo_id, 'image/jpeg', 1000);

  -- ---------- helper: הפקודה חייבת להיכשל ----------
  create function pg_temp.must_fail(p_sql text) returns boolean language plpgsql as $f$
  begin
    execute p_sql;
    return false;
  exception when others then
    return true;
  end $f$;

  -- ---------- C (זר) לא נוגע במרחב 1 ----------
  for r in select * from (values
    ('set_reaction',       format('select public.set_reaction(%L, %L, ''yes'')', c, idea.id)),
    ('add_comment',        format('select public.add_comment(%L, gen_random_uuid(), %L, ''x'')', c, idea.id)),
    ('edit_comment',       format('select public.edit_comment(%L, %L, 1, ''x'')', c, comment_id)),
    ('delete_comment',     format('select public.delete_comment(%L, %L, 1)', c, comment_id)),
    ('update_idea',        format('select public.update_idea(%L, %L, %s, ''x'', '''', ''other'', null, null, null, null, null)', c, idea.id, idea.version)),
    ('archive_idea',       format('select public.archive_idea(%L, %L, %s)', c, idea.id, idea.version)),
    ('create_plan',        format('select public.create_plan(%L, gen_random_uuid(), %L, null, null, ''Asia/Jerusalem'', null, '''', null)', c, idea.id)),
    ('update_memory',      format('select public.update_memory(%L, %L, 1, current_date, ''x'')', c, mem_id)),
    ('create_photo_upload',format('select public.create_photo_upload(%L, gen_random_uuid(), %L, ''image/jpeg'', 10)', c, mem_id)),
    ('finalize_photo',     format('select public.finalize_photo(%L, %L, ''image/jpeg'', 10)', c, photo_id)),
    ('begin_delete_photo', format('select public.begin_delete_photo(%L, %L)', c, photo_id))
  ) as t(name, sql) loop
    checks := checks + 1;
    if not pg_temp.must_fail(r.sql) then failures := failures || ('C:' || r.name); end if;
  end loop;

  -- קריאות "שקטות" (מחזירות ריק במקום שגיאה) — C לא מקבל שום דבר ממרחב 1
  checks := checks + 1;
  if public.export_photo_path(c, photo_id) is not null then failures := failures || 'C:export_photo_path'::text; end if;
  checks := checks + 1;
  v := public.export_space_data(c);
  if jsonb_array_length(v->'memories') <> 0 or jsonb_array_length(v->'ideas') <> 0 then failures := failures || 'C:export_space_data'::text; end if;
  checks := checks + 1;
  v := public.push_context(c, idea.id, plan_id, mem_id);
  if v->>'ideaTitle' is not null or v->>'planTitle' is not null then failures := failures || 'C:push_context'::text; end if;
  checks := checks + 1;
  if public.abort_photo_upload(c, photo_id) then failures := failures || 'C:abort_photo_upload'::text; end if;

  -- ---------- B (בן/בת זוג) — רק מה שמותר ----------
  checks := checks + 1;
  if not pg_temp.must_fail(format('select public.begin_delete_photo(%L, %L)', b, photo_id)) then failures := failures || 'B:delete A photo'::text; end if;
  checks := checks + 1;
  if not pg_temp.must_fail(format('select public.edit_comment(%L, %L, 1, ''x'')', b, comment_id)) then failures := failures || 'B:edit A comment'::text; end if;
  -- ומה שכן מותר ל-B: לענות, לכתוב, לראות בייצוא
  checks := checks + 1;
  if pg_temp.must_fail(format('select public.set_reaction(%L, %L, ''yes'')', b, idea.id)) then failures := failures || 'B:set_reaction blocked'::text; end if;
  checks := checks + 1;
  if public.export_photo_path(b, photo_id) is null then failures := failures || 'B:export blocked'::text; end if;

  -- סגירה: A סוגר, B לא יכול לבטל, C לא מושפע
  perform public.close_space(a, false, 14);
  checks := checks + 1;
  if not pg_temp.must_fail(format('select public.reopen_space(%L)', b)) then failures := failures || 'B:reopen A closure'::text; end if;
  checks := checks + 1;
  if not pg_temp.must_fail(format('select public.add_comment(%L, gen_random_uuid(), %L, ''x'')', b, idea.id)) then failures := failures || 'B:write in closed space'::text; end if;
  checks := checks + 1;
  if (select status from public.get_my_space_state(c)) <> 'open' then failures := failures || 'C:affected by closure'::text; end if;
  checks := checks + 1;
  if not pg_temp.must_fail('select public.close_space(null::uuid, false, 0)') then failures := failures || 'close_space null actor'::text; end if;

  -- ---------- אין פונקציית שירות פתוחה ל-anon/authenticated ----------
  for r in
    select p.oid::regprocedure::text as fn, p.proname::text as name,
           has_function_privilege('anon', p.oid, 'execute') as anon_x,
           has_function_privilege('authenticated', p.oid, 'execute') as auth_x
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
  loop
    checks := checks + 1;
    if r.anon_x then failures := failures || ('anon can execute ' || r.fn); end if;
    -- 4 הפונקציות היחידות שמיועדות ל-authenticated (בודקות auth.uid() בעצמן)
    if r.auth_x and r.name not in ('get_idea_reactions', 'get_invitation_status', 'has_pending_invitation_for_me', 'list_my_matches') then
      failures := failures || ('authenticated can execute ' || r.fn);
    end if;
  end loop;

  if array_length(failures, 1) is null then
    raise exception 'ALL PASS (% checks)', checks;
  else
    raise exception 'FAILED %/%: %', array_length(failures, 1), checks, array_to_string(failures, ' | ');
  end if;
end $$;
