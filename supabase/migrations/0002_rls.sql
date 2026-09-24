-- ==========================================================================
-- 0002_rls.sql
--
-- מקור: docs/The-Bucket-List-Technical-Spec-HE.md סעיף 10.2.
-- RLS — קריאה בלבד ללקוחות. אין DML grants ואין INSERT/UPDATE/DELETE
-- policies ל-anon/authenticated בקובץ הזה. כל writes עוברות דרך RPC שירות
-- (ראו 0003+, וסעיף 13.4 במסמך). לפני production: לסקור grants בפועל,
-- ולוודא REVOKE EXECUTE FROM PUBLIC/anon/authenticated לכל RPC שירות
-- עם GRANT רק ל-service_role.
-- ==========================================================================

-- פונקציות עזר בבעלות תפקיד migration מהימן, עם search_path קבוע.
create or replace function private.is_member(p_space uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.space_members m
    join public.spaces s on s.id = m.space_id
    where m.space_id = p_space and m.user_id = auth.uid() and s.status = 'open'
  );
$$;

create or replace function private.can_read_profile(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_user = auth.uid() or exists (
    select 1 from public.space_members mine
    join public.space_members other on other.space_id = mine.space_id
    join public.spaces s on s.id = mine.space_id
    where mine.user_id = auth.uid() and other.user_id = p_user and s.status = 'open'
  );
$$;
revoke all on function private.is_member(uuid) from public, anon, authenticated;
revoke all on function private.can_read_profile(uuid) from public, anon, authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.can_read_profile(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','spaces','space_members','ideas',
    'idea_reactions','idea_comments','plans','plan_confirmations','memories','memory_photos']
  loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
  foreach t in array array['invitations','mutation_keys','audit_events'] loop
    execute format('alter table private.%I enable row level security',t);
    execute format('revoke all on private.%I from public, anon, authenticated',t);
  end loop;
end $$;

create policy profiles_read on public.profiles for select to authenticated
  using (private.can_read_profile(id));
create policy spaces_read on public.spaces for select to authenticated
  using (private.is_member(id));

do $$
declare t text;
begin
  foreach t in array array['space_members','ideas','idea_comments','plans',
    'plan_confirmations','memories'] loop
    execute format('create policy member_read on public.%I for select to authenticated
      using (private.is_member(space_id))',t);
  end loop;
end $$;

create policy own_reaction_read on public.idea_reactions for select to authenticated
  using (user_id = auth.uid() and private.is_member(space_id));
create policy photos_ready_read on public.memory_photos for select to authenticated
  using (status = 'ready' and private.is_member(space_id));

-- RPC מחושבת: חושפת רק מאצ'ים, ללא שורות או ערכי תגובה של האחר.
create or replace function public.list_my_matches(p_space uuid)
returns table (idea_id uuid)
language sql stable security definer set search_path = ''
as $$
  select i.id from public.ideas i
  where i.space_id = p_space and i.status = 'active'
    and private.is_member(p_space)
    and (select count(*) from public.space_members m where m.space_id = p_space) = 2
    and (select count(*) from public.idea_reactions r
         join public.space_members m on m.space_id = r.space_id and m.user_id = r.user_id
         where r.idea_id = i.id and r.preference = 'yes') = 2;
$$;
revoke all on function public.list_my_matches(uuid) from public, anon, authenticated;
grant execute on function public.list_my_matches(uuid) to authenticated;

-- RLS חלה גם בגישה ישירה ל-Data API; מסנן space_id ב-UI אינו תחליף למדיניות.
-- תפקיד service role עוקף RLS ולכן כל RPC כתיבה חייבת לבצע בעצמה את בדיקות
-- החברות והבעלות (ראו https://supabase.com/docs/guides/database/postgres/row-level-security).
