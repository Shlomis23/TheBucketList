-- ==========================================================================
-- 0024_smart_notifications.sql — התראות חכמות (שלומי, 25.9):
--   1. מאצ' — לשני בני הזוג (גם למי שענה עכשיו): push_context מקבל
--      p_include_actor.
--   2. תזכורת יום לפני תוכנית ("מחר ב-19:30: ...") — מהמשימה היומית.
--   3. "איך היה?" למחרת תוכנית שעוד לא נסגרה — מהמשימה היומית.
-- private.push_log: כל התראה מתוזמנת נשלחת פעם אחת בלבד (גם אם המשימה
-- רצה פעמיים). תזכורת תלויה גם בשעה — תוכנית שהוזזה מקבלת תזכורת חדשה.
-- ==========================================================================

create table private.push_log (
  key text primary key check (char_length(key) <= 200),
  sent_at timestamptz not null default now()
);
alter table private.push_log enable row level security;

drop function public.push_context(uuid, uuid, uuid, uuid);

create function public.push_context(
  p_actor uuid,
  p_idea_id uuid default null,
  p_plan_id uuid default null,
  p_memory_id uuid default null,
  p_include_actor boolean default false
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_status text;
  v_plan public.plans%rowtype;
begin
  select m.space_id, s.status into v_space, v_status
    from public.space_members m join public.spaces s on s.id = m.space_id
   where m.user_id = p_actor;
  if v_space is null then
    return null;
  end if;

  if p_memory_id is not null then
    select pl.* into v_plan from public.memories mem join public.plans pl on pl.id = mem.plan_id
     where mem.id = p_memory_id and mem.space_id = v_space;
  elsif p_plan_id is not null then
    select * into v_plan from public.plans where id = p_plan_id and space_id = v_space;
  end if;

  return jsonb_build_object(
    'spaceStatus', v_status,
    'actorName', (select display_name from public.profiles where id = p_actor),
    'ideaTitle', (select title from public.ideas where id = p_idea_id and space_id = v_space),
    'planTitle', v_plan.title,
    'planStartsAt', v_plan.starts_at,
    'targets', (
      select coalesce(jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)), '[]'::jsonb)
        from public.space_members other
        join private.push_subscriptions ps on ps.user_id = other.user_id
       where other.space_id = v_space and (p_include_actor or other.user_id <> p_actor)
    )
  );
end;
$$;

-- התראות מתוזמנות להיום (לפי שעון ישראל). רק תוכניות פעילות במרחב פתוח.
create or replace function public.due_plan_notifications()
returns table (kind text, plan_id uuid, title text, starts_at timestamptz, targets jsonb)
language sql stable security definer set search_path = ''
as $$
  with today as (select (now() at time zone 'Asia/Jerusalem')::date as d),
  due as (
    select 'reminder'::text as kind, p.*
      from public.plans p join public.spaces s on s.id = p.space_id, today
     where p.status = 'proposed' and s.status = 'open' and p.starts_at is not null
       and (p.starts_at at time zone 'Asia/Jerusalem')::date = today.d + 1
    union all
    select 'how_was'::text, p.*
      from public.plans p join public.spaces s on s.id = p.space_id, today
     where p.status = 'proposed' and s.status = 'open' and p.starts_at is not null
       and (p.starts_at at time zone 'Asia/Jerusalem')::date = today.d - 1
       and coalesce(p.ends_at, p.starts_at + interval '3 hours') < now()
  )
  select due.kind, due.id, due.title, due.starts_at,
         (select coalesce(jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)), '[]'::jsonb)
            from public.space_members m join private.push_subscriptions ps on ps.user_id = m.user_id
           where m.space_id = due.space_id)
    from due;
$$;

-- "תופס" מפתח: true רק בפעם הראשונה — ורק אז שולחים.
create or replace function public.claim_push(p_key text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  delete from private.push_log where sent_at < now() - interval '60 days';
  insert into private.push_log (key) values (p_key) on conflict (key) do nothing;
  return found;
end;
$$;

revoke all on function public.push_context(uuid, uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.due_plan_notifications() from public, anon, authenticated;
revoke all on function public.claim_push(text) from public, anon, authenticated;
grant execute on function public.push_context(uuid, uuid, uuid, uuid, boolean) to service_role;
grant execute on function public.due_plan_notifications() to service_role;
grant execute on function public.claim_push(text) to service_role;
