-- ==========================================================================
-- supabase/tests/calendar_feed.sql — היומן במינוי (0037). כמו authorization.sql:
-- טרנזקציה אחת שמתבטלת, והתוצאה תמיד "שגיאה": ALL PASS (N checks) / FAILED.
-- ==========================================================================
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid();
  idea public.ideas; idea2 public.ideas; p1 uuid; p2 uuid; ta text; tb text; tc text; ta2 text;
  checks int := 0; failures text[] := '{}';
  create_fails boolean;
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'authz-a@test.invalid', 'authenticated', 'authenticated'),
    (b, 'authz-b@test.invalid', 'authenticated', 'authenticated'),
    (c, 'authz-c@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (id, display_name) values (a, 'A'), (b, 'B'), (c, 'C');
  insert into public.spaces (id, status, timezone) values (s1, 'open', 'Asia/Jerusalem'), (s2, 'open', 'Asia/Jerusalem');
  insert into public.space_members (space_id, user_id, slot) values (s1, a, 1), (s1, b, 2), (s2, c, 1);
  idea := public.create_idea(a, gen_random_uuid(), 'רעיון 1', '', 'other', null, null, null, null, null, true);
  idea2 := public.create_idea(a, gen_random_uuid(), 'רעיון 2', '', 'other', null, null, null, null, null, true);
  p1 := (public.create_plan(a, gen_random_uuid(), idea.id, now() + interval '3 days', null, 'Asia/Jerusalem', 'מקום', '', null)).id;
  p2 := (public.create_plan(a, gen_random_uuid(), idea2.id, now() + interval '5 days', null, 'Asia/Jerusalem', null, '', null)).id;
  update public.plans set status = 'cancelled' where id = p2;

  ta := public.calendar_feed_token(a);
  tb := public.calendar_feed_token(b);
  tc := public.calendar_feed_token(c);
  checks := checks + 1;
  if char_length(ta) <> 64 or ta = tb or public.calendar_feed_token(a) <> ta then failures := failures || 'token: length/unique/stable'::text; end if;
  checks := checks + 1;
  if (select count(*) from public.calendar_feed_plans(ta)) <> 1 or (select count(*) from public.calendar_feed_plans(tb)) <> 1 then failures := failures || 'feed: A/B should see 1 (cancelled excluded)'::text; end if;
  checks := checks + 1;
  if (select count(*) from public.calendar_feed_plans(tc)) <> 0 then failures := failures || 'feed: C sees foreign plans'::text; end if;
  checks := checks + 1;
  begin perform * from public.calendar_feed_plans(repeat('0', 64)); create_fails := false; exception when others then create_fails := true; end;
  if not create_fails then failures := failures || 'feed: unknown token accepted'::text; end if;
  ta2 := public.calendar_feed_token(a, true);
  checks := checks + 1;
  begin perform * from public.calendar_feed_plans(ta); create_fails := false; exception when others then create_fails := true; end;
  if not create_fails or ta2 = ta or (select count(*) from public.calendar_feed_plans(ta2)) <> 1 then failures := failures || 'rotate: old still works / new broken'::text; end if;
  perform public.close_space(a, false, 14);
  checks := checks + 1;
  if (select count(*) from public.calendar_feed_plans(tb)) <> 0 then failures := failures || 'feed: closed space still visible'::text; end if;
  checks := checks + 1;
  begin perform public.calendar_feed_token(null); create_fails := false; exception when others then create_fails := true; end;
  if not create_fails then failures := failures || 'token: null actor'::text; end if;
  checks := checks + 1;
  if has_function_privilege('anon', 'public.calendar_feed_plans(text)', 'execute') or has_function_privilege('authenticated', 'public.calendar_feed_plans(text)', 'execute')
     or has_function_privilege('anon', 'public.calendar_feed_token(uuid, boolean)', 'execute') or has_function_privilege('authenticated', 'public.calendar_feed_token(uuid, boolean)', 'execute') then
    failures := failures || 'grants open'::text; end if;
  if array_length(failures, 1) is null then
    raise exception 'ALL PASS (% checks)', checks;
  else
    raise exception 'FAILED %/%: %', array_length(failures, 1), checks, array_to_string(failures, ' | ');
  end if;
end $$;
