-- ==========================================================================
-- 0012_fix_create_invitation_ambiguous_id.sql
--
-- אותו באג כמו 0008 (set_reaction): RETURNS TABLE(id uuid, ...) הופך את
-- "id" למשתנה PL/pgSQL בגוף הפונקציה, שמתנגש עם "where id = v_space" על
-- public.spaces -> "column reference \"id\" is ambiguous" (42702) בכל
-- קריאה אמיתית ל-create_invitation. אומת מול production (הבאג שוחזר
-- תחילה), תוקן ע"י aliasing מפורש לטבלה (s.id/s.status).
-- ==========================================================================

create or replace function public.create_invitation(
  p_actor uuid, p_target_email text, p_token_hash text
) returns table(id uuid, target_email text, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_status text;
  v_email text := lower(btrim(p_target_email));
  v_expires timestamptz := clock_timestamp() + interval '48 hours';
  v_id uuid;
begin
  if v_email is null or v_email = '' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'INVALID_INPUT';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_INPUT';
  end if;
  if not public.check_rate_limit('invite_issue:' || p_actor::text, 5, 3600) then
    raise exception 'RATE_LIMITED';
  end if;

  select space_id into v_space from public.space_members where user_id = p_actor;
  if v_space is null then raise exception 'INVITE_UNAVAILABLE'; end if;

  -- סדר נעילות זהה ל-accept/revoke: לנעול spaces לפני invitations.
  -- s.id/s.status: aliasing מפורש כדי לא להתנגש עם המשתנה הגלום "id"
  -- שנוצר מ-RETURNS TABLE(id uuid, ...) — ראו 0008 לתקדים זהה.
  select s.status into v_status from public.spaces s where s.id = v_space for update;
  if v_status is distinct from 'open' then raise exception 'INVITE_UNAVAILABLE'; end if;

  if (select count(*) from public.space_members where space_id = v_space) <> 1 then
    raise exception 'ALREADY_IN_SPACE';
  end if;
  if not exists (select 1 from public.space_members
      where space_id = v_space and user_id = p_actor and slot = 1) then
    raise exception 'INVITE_UNAVAILABLE';
  end if;

  update private.invitations set status = 'revoked'
    where space_id = v_space and status = 'pending';

  insert into private.invitations (space_id, created_by, target_email, token_hash, expires_at)
    values (v_space, p_actor, v_email, p_token_hash, v_expires)
    returning private.invitations.id into v_id;
  insert into private.audit_events (space_id, actor_id, event_type)
    values (v_space, p_actor, 'invitation.created');

  return query select v_id, v_email, v_expires;
end;
$$;
revoke all on function public.create_invitation(uuid,text,text) from public, anon, authenticated;
grant execute on function public.create_invitation(uuid,text,text) to service_role;
