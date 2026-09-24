-- ==========================================================================
-- 0011_invitation_rpcs.sql
--
-- RPC שירות להזמנת בן/בת הזוג (F1/F2, spec סעיף 10.3, 11.1, 11.2, 13.2, 13.3).
-- accept_invitation_internal כבר קיימת (0003_accept_invitation.sql) — כאן
-- רק ההנפקה, הביטול, הסטטוס, ורשת rate limiting משותפת (DB-backed, לא
-- זיכרון תהליך בודד — spec: "אין הסתמכות על זיכרון תהליך בודד").
--
-- הטוקן הגולמי (CSPRNG, >=32 bytes, base64url) נוצר ונחשב (SHA-256) ב-Node
-- (lib/dal/invitations.ts) — אף פעם לא ב-SQL ואף פעם לא נשמר, רק ה-hash.
-- ==========================================================================

create table private.rate_limits (
  key text primary key,
  window_start timestamptz not null default clock_timestamp(),
  count integer not null default 0
);
alter table private.rate_limits enable row level security;
revoke all on private.rate_limits from public, anon, authenticated;

-- מונה חלון-קבוע (fixed window) אטומי ב-DB — עמיד למספר instances/serverless,
-- בניגוד למונה בזיכרון תהליך. מחזיר true אם מותר (והגדיל את המונה),
-- false אם עברו את התקרה בחלון הנוכחי.
create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_count int;
begin
  insert into private.rate_limits as rl (key, window_start, count)
    values (p_key, clock_timestamp(), 1)
  on conflict (key) do update set
    window_start = case
      when rl.window_start <= clock_timestamp() - make_interval(secs => p_window_seconds)
        then clock_timestamp() else rl.window_start end,
    count = case
      when rl.window_start <= clock_timestamp() - make_interval(secs => p_window_seconds)
        then 1 else rl.count + 1 end
  returning count into v_count;
  return v_count <= p_max;
end;
$$;
revoke all on function public.check_rate_limit(text,int,int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text,int,int) to service_role;

-- createInvitation — spec 13.2: נעילת space; חבר יחיד; מנפיק slot1;
-- revoke pending קודמת (גם אם פגה); hash+תוקף (48 שעות). מחזיר את שורת
-- ההזמנה; הטוקן הגולמי עצמו לא עובר כאן בכלל.
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
  select status into v_status from public.spaces where id = v_space for update;
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

-- revokeInvitation — spec 13.2: מנפיק בלבד; מרחב פתוח; pending בלבד;
-- lock space קודם. NOT_FOUND גם כשהמזמין הוא לא היוצר, כדי לא לדלוף מידע.
create or replace function public.revoke_invitation(p_actor uuid, p_invitation_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_status text;
  v_inv private.invitations%rowtype;
begin
  select space_id into v_space from private.invitations where id = p_invitation_id;
  if v_space is null then raise exception 'NOT_FOUND'; end if;

  select status into v_status from public.spaces where id = v_space for update;
  if v_status is distinct from 'open' then raise exception 'INVITE_UNAVAILABLE'; end if;

  select * into v_inv from private.invitations where id = p_invitation_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_inv.created_by <> p_actor then raise exception 'NOT_FOUND'; end if;
  if v_inv.status <> 'pending' then raise exception 'VERSION_CONFLICT'; end if;

  update private.invitations set status = 'revoked' where id = p_invitation_id;
  insert into private.audit_events (space_id, actor_id, event_type)
    values (v_space, p_actor, 'invitation.revoked');
  return true;
end;
$$;
revoke all on function public.revoke_invitation(uuid,uuid) from public, anon, authenticated;
grant execute on function public.revoke_invitation(uuid,uuid) to service_role;

-- getInvitationStatus — קריאה בלבד, RPC בטוחה עם auth.uid() פנימי (כמו
-- list_my_matches/is_member) — לא צריך service role כי אין כתיבה.
-- email מוסווה; אף פעם לא token/hash (spec 13.3, 11.1).
create or replace function public.get_invitation_status()
returns table(id uuid, masked_email text, status text, expires_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select inv.id,
    left(inv.target_email, 1) || '***@' || split_part(inv.target_email, '@', 2),
    inv.status,
    inv.expires_at,
    inv.created_at
  from private.invitations inv
  where inv.created_by = auth.uid()
  order by inv.created_at desc
  limit 1;
$$;
revoke all on function public.get_invitation_status() from public, anon, authenticated;
grant execute on function public.get_invitation_status() to authenticated;
