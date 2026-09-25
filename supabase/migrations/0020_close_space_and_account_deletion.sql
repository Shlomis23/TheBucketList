-- ==========================================================================
-- 0020_close_space_and_account_deletion.sql
--
-- סגירת מרחב ומחיקת חשבון — F8, spec 11.4/13.2. החלטות שלומי (25.9):
--   1. סגירה חד-צדדית: כל אחד מבני הזוג יכול לסגור; המרחב ננעל לשניהם מיד.
--   2. תקופת חרטה של 14 יום: רק מי שסגר יכול לבטל. בסופה הכול נמחק
--      (שורות + קבצים ב-Storage) ע"י משימה יומית (app/api/cron/daily).
--   3. שני הצדדים יכולים להוריד ZIP של הזיכרונות גם בזמן החרטה.
--   4. מחיקת חשבון: אם יש בן/בת זוג — סוגרת את המרחב באותו מסלול, והחשבון
--      נמחק יחד עם המרחב בסוף 14 הימים. אם לבד במרחב — הכול נמחק מיד.
--
-- הנעילה עצמה כבר קיימת: private.is_member דורש status='open', כך שכל
-- RLS וכל RPC כתיבה חוסמים מרחב סגור. כאן: מצב החרטה, הפונקציות, והמחיקה.
-- כל הפונקציות service_role בלבד, p_actor מה-session בשרת.
-- ==========================================================================

alter table public.spaces
  add column closed_by uuid references public.profiles(id) on delete set null,
  add column purge_after timestamptz,
  add constraint spaces_purge_after_when_closed check (
    (status = 'open' and purge_after is null) or (status = 'closed' and purge_after is not null)
  );

-- מי שביקש למחוק את החשבון שלו. נמחק (auth.users) יחד עם המרחב.
alter table public.profiles
  add column deletion_requested_at timestamptz;

-- ---------------------------------------------------------------------------
-- מצב המרחב שלי — גם כשהוא סגור (RLS כבר לא מחזירה עליו כלום).
-- ---------------------------------------------------------------------------
create or replace function public.get_my_space_state(p_actor uuid)
returns table (
  space_id uuid,
  status text,
  closed_at timestamptz,
  purge_after timestamptz,
  closed_by_me boolean,
  closed_by_name text,
  member_count int,
  deletion_requested boolean
)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.status, s.closed_at, s.purge_after,
         coalesce(s.closed_by = p_actor, false),
         (select p.display_name from public.profiles p where p.id = s.closed_by),
         (select count(*)::int from public.space_members x where x.space_id = s.id),
         (select me.deletion_requested_at is not null from public.profiles me where me.id = p_actor)
    from public.space_members m
    join public.spaces s on s.id = m.space_id
   where m.user_id = p_actor;
$$;

-- ---------------------------------------------------------------------------
-- סגירה. p_delete_account = גם בקשת מחיקת חשבון של הסוגר.
-- p_grace_days: 14 תמיד מהאפליקציה; 0 רק למחיקה מיידית של חבר יחיד (נבדק).
-- ---------------------------------------------------------------------------
create or replace function public.close_space(
  p_actor uuid,
  p_delete_account boolean default false,
  p_grace_days int default 14
) returns public.spaces
language plpgsql security definer set search_path = ''
as $$
declare
  v_space public.spaces%rowtype;
  v_members int;
begin
  if p_grace_days is null or p_grace_days not in (0, 14) then
    raise exception 'INVALID_INPUT';
  end if;

  select s.* into v_space
    from public.spaces s
    join public.space_members m on m.space_id = s.id
   where m.user_id = p_actor
   for update of s;
  if v_space.id is null then
    raise exception 'NOT_MEMBER';
  end if;
  if v_space.status <> 'open' then
    raise exception 'VERSION_CONFLICT';
  end if;

  select count(*) into v_members from public.space_members where space_id = v_space.id;
  -- מחיקה מיידית רק כשאין מישהו נוסף שהמידע שלו נמחק איתו.
  if p_grace_days = 0 and (v_members > 1 or not p_delete_account) then
    raise exception 'INVALID_INPUT';
  end if;

  update public.spaces
     set status = 'closed',
         closed_at = now(),
         closed_by = p_actor,
         purge_after = now() + make_interval(days => p_grace_days)
   where id = v_space.id
   returning * into v_space;

  -- הזמנה פתוחה לא תאפשר הצטרפות למרחב שנסגר.
  update private.invitations set status = 'revoked'
   where space_id = v_space.id and status = 'pending';

  if p_delete_account then
    update public.profiles set deletion_requested_at = now() where id = p_actor;
  end if;

  insert into private.audit_events (space_id, actor_id, event_type)
    values (v_space.id, p_actor, case when p_delete_account then 'space_closed_account_deletion' else 'space_closed' end);

  return v_space;
end;
$$;

-- ---------------------------------------------------------------------------
-- ביטול הסגירה — רק מי שסגר, רק לפני המחיקה. מבטל גם את בקשת מחיקת החשבון.
-- ---------------------------------------------------------------------------
create or replace function public.reopen_space(p_actor uuid)
returns public.spaces
language plpgsql security definer set search_path = ''
as $$
declare
  v_space public.spaces%rowtype;
begin
  select s.* into v_space
    from public.spaces s
    join public.space_members m on m.space_id = s.id
   where m.user_id = p_actor
   for update of s;
  if v_space.id is null or v_space.status <> 'closed' then
    raise exception 'NOT_FOUND';
  end if;
  if v_space.closed_by is distinct from p_actor then
    raise exception 'NOT_AUTHOR';
  end if;
  if v_space.purge_after <= now() then
    raise exception 'VERSION_CONFLICT';
  end if;

  update public.spaces
     set status = 'open', closed_at = null, closed_by = null, purge_after = null
   where id = v_space.id
   returning * into v_space;

  update public.profiles set deletion_requested_at = null where id = p_actor;

  insert into private.audit_events (space_id, actor_id, event_type)
    values (v_space.id, p_actor, 'space_reopened');

  return v_space;
end;
$$;

-- ---------------------------------------------------------------------------
-- ייצוא (ZIP) — מותר לחבר במרחב פתוח, או סגור שעוד לא נמחק. מחזיר JSON
-- אחד; הקבצים עצמם נמשכים אחד-אחד (export_photo_path).
-- ---------------------------------------------------------------------------
create or replace function private.export_space_for(p_actor uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select s.id
    from public.space_members m
    join public.spaces s on s.id = m.space_id
   where m.user_id = p_actor
     and (s.status = 'open' or s.purge_after > now());
$$;

create or replace function public.export_space_data(p_actor uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_space uuid := private.export_space_for(p_actor);
begin
  if v_space is null then
    raise exception 'NOT_FOUND';
  end if;

  return jsonb_build_object(
    'members', (
      select coalesce(jsonb_agg(p.display_name order by m.slot), '[]'::jsonb)
        from public.space_members m join public.profiles p on p.id = m.user_id
       where m.space_id = v_space
    ),
    'memories', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', mem.id,
               'title', pl.title,
               'happenedOn', mem.happened_on,
               'story', mem.story,
               'createdBy', (select display_name from public.profiles where id = mem.created_by),
               'photos', (
                 select coalesce(jsonb_agg(jsonb_build_object(
                          'id', ph.id,
                          'uploadedBy', (select display_name from public.profiles where id = ph.uploaded_by)
                        ) order by ph.sort_order, ph.created_at), '[]'::jsonb)
                   from public.memory_photos ph
                  where ph.memory_id = mem.id and ph.status = 'ready'
               )
             ) order by mem.happened_on desc, mem.id desc), '[]'::jsonb)
        from public.memories mem
        join public.plans pl on pl.id = mem.plan_id
       where mem.space_id = v_space
    ),
    'ideas', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'title', i.title,
               'category', i.category,
               'description', i.description,
               'location', i.location_text,
               'link', i.source_url,
               'status', i.status,
               'createdAt', i.created_at,
               'createdBy', (select display_name from public.profiles where id = i.created_by)
             ) order by i.created_at), '[]'::jsonb)
        from public.ideas i
       where i.space_id = v_space
    )
  );
end;
$$;

create or replace function public.export_photo_path(p_actor uuid, p_photo_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select ph.object_path
    from public.memory_photos ph
   where ph.id = p_photo_id
     and ph.status = 'ready'
     and ph.space_id = private.export_space_for(p_actor);
$$;

-- ---------------------------------------------------------------------------
-- המשימה היומית
-- ---------------------------------------------------------------------------
create or replace function public.list_spaces_due_for_purge()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.spaces where status = 'closed' and purge_after <= now() order by purge_after;
$$;

-- מחיקת כל השורות של מרחב סגור, לפי סדר ה-FK (חלקם בכוונה בלי cascade).
-- הקבצים ב-Storage נמחקים ע"י השרת *לפני* הקריאה הזו (צריך את הנתיבים).
-- מחזיר את המשתמשים שביקשו מחיקת חשבון — השרת מוחק אותם מ-Auth אחרי זה
-- (profiles נמחק ב-cascade מ-auth.users).
create or replace function public.purge_space(p_space_id uuid)
returns setof uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_space public.spaces%rowtype;
  v_delete_users uuid[];
begin
  select * into v_space from public.spaces where id = p_space_id for update;
  if v_space.id is null then
    return; -- כבר נמחק (ריצה חוזרת)
  end if;
  if v_space.status <> 'closed' then
    raise exception 'NOT_CLOSED';
  end if;

  select coalesce(array_agg(p.id), '{}') into v_delete_users
    from public.space_members m join public.profiles p on p.id = m.user_id
   where m.space_id = p_space_id and p.deletion_requested_at is not null;

  delete from public.memory_photos where space_id = p_space_id;
  delete from public.memories where space_id = p_space_id;
  delete from public.plan_confirmations where space_id = p_space_id;
  delete from public.plans where space_id = p_space_id;
  delete from public.idea_comments where space_id = p_space_id;
  delete from public.idea_reactions where space_id = p_space_id;
  delete from public.ideas where space_id = p_space_id;
  delete from private.invitations where space_id = p_space_id;
  delete from public.space_members where space_id = p_space_id;
  delete from public.spaces where id = p_space_id;

  -- שאריות שמחזיקות FK ל-profiles של מי שנמחק (בלי cascade בכוונה).
  delete from private.mutation_keys where actor_id = any(v_delete_users);
  delete from private.invitations where created_by = any(v_delete_users) or accepted_by = any(v_delete_users);

  insert into private.audit_events (space_id, actor_id, event_type)
    values (null, null, 'space_purged');

  return query select unnest(v_delete_users);
end;
$$;

-- מחיקת חשבון של מי שאין לו מרחב בכלל (למשל אחרי שהמרחב נמחק): רק ניקוי
-- השאריות; השרת מוחק את המשתמש מ-Auth אחרי זה.
create or replace function public.prepare_account_deletion_without_space(p_actor uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.space_members where user_id = p_actor) then
    raise exception 'ALREADY_IN_SPACE';
  end if;
  delete from private.mutation_keys where actor_id = p_actor;
  delete from private.invitations where created_by = p_actor or accepted_by = p_actor;
  return true;
end;
$$;

-- העלאות שנתקעו (pending/deleting יותר משעה): מוחק את השורות ומחזיר את
-- הנתיבים כדי שהשרת ימחק את הקבצים.
create or replace function public.cleanup_stale_photos()
returns setof text
language sql security definer set search_path = ''
as $$
  delete from public.memory_photos
   where status in ('pending', 'deleting', 'failed') and created_at < now() - interval '1 hour'
  returning object_path;
$$;

revoke all on function public.get_my_space_state(uuid) from public, anon, authenticated;
revoke all on function public.close_space(uuid, boolean, int) from public, anon, authenticated;
revoke all on function public.reopen_space(uuid) from public, anon, authenticated;
revoke all on function private.export_space_for(uuid) from public, anon, authenticated;
revoke all on function public.export_space_data(uuid) from public, anon, authenticated;
revoke all on function public.export_photo_path(uuid, uuid) from public, anon, authenticated;
revoke all on function public.list_spaces_due_for_purge() from public, anon, authenticated;
revoke all on function public.purge_space(uuid) from public, anon, authenticated;
revoke all on function public.prepare_account_deletion_without_space(uuid) from public, anon, authenticated;
revoke all on function public.cleanup_stale_photos() from public, anon, authenticated;
grant execute on function public.get_my_space_state(uuid) to service_role;
grant execute on function public.close_space(uuid, boolean, int) to service_role;
grant execute on function public.reopen_space(uuid) to service_role;
grant execute on function public.export_space_data(uuid) to service_role;
grant execute on function public.export_photo_path(uuid, uuid) to service_role;
grant execute on function public.list_spaces_due_for_purge() to service_role;
grant execute on function public.purge_space(uuid) to service_role;
grant execute on function public.prepare_account_deletion_without_space(uuid) to service_role;
grant execute on function public.cleanup_stale_photos() to service_role;
