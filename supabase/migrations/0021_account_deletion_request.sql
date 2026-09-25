-- ==========================================================================
-- 0021_account_deletion_request.sql — השלמה ל-0020.
--
-- 1. request_account_deletion: מי שלא סגר את המרחב (בן/בת הזוג) יכול לבקש
--    שגם החשבון שלו יימחק יחד עם המרחב בסוף 14 הימים.
-- 2. reopen_space מנקה את בקשות המחיקה של *שני* החברים: מרחב שנפתח מחדש
--    חוזר למצב רגיל לגמרי — בקשה ישנה לא תפעל בסגירה עתידית.
-- ==========================================================================

create or replace function public.request_account_deletion(p_actor uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_space public.spaces%rowtype;
begin
  select s.* into v_space
    from public.spaces s join public.space_members m on m.space_id = s.id
   where m.user_id = p_actor
   for update of s;
  if v_space.id is null or v_space.status <> 'closed' or v_space.purge_after <= now() then
    raise exception 'NOT_FOUND';
  end if;
  update public.profiles set deletion_requested_at = now() where id = p_actor;
  insert into private.audit_events (space_id, actor_id, event_type)
    values (v_space.id, p_actor, 'account_deletion_requested');
  return true;
end;
$$;

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

  update public.profiles set deletion_requested_at = null
   where id in (select user_id from public.space_members where space_id = v_space.id);

  insert into private.audit_events (space_id, actor_id, event_type)
    values (v_space.id, p_actor, 'space_reopened');

  return v_space;
end;
$$;

revoke all on function public.request_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.request_account_deletion(uuid) to service_role;
