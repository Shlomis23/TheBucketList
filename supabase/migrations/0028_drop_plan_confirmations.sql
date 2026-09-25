-- 0028: ניקוי שלב אישור התוכנית (בוטל ב-25.9, "אופציה א" — ראו
-- docs/DECISIONS-HE.md). הטבלה ריקה ואין קוד שקורא ל-RPCs; purge_space
-- נכתבת מחדש בלי השורה שמחקה ממנה.

drop function if exists public.confirm_plan(uuid, uuid, integer);
drop function if exists public.unconfirm_plan(uuid, uuid, integer);

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

drop table if exists public.plan_confirmations;
