-- ==========================================================================
-- 0022_push_subscriptions.sql
--
-- התראות לטלפון (Web Push) — שלומי אישר (26.9). כל מכשיר שהפעיל התראות
-- נשמר כאן (endpoint + מפתחות ההצפנה של הדפדפן). השרת שולח לבן/בת הזוג
-- כשמשהו קורה: רעיון חדש, הודעה בשיחה, תוכנית חדשה/עודכנה/אושרה, זיכרון,
-- סגירת מרחב. אף פעם לא למי שעשה את הפעולה עצמו.
--
-- הטבלה ב-private (לא נחשפת ב-API בכלל); הכול דרך RPC של service_role.
-- מחיקת חשבון -> cascade מ-profiles.
-- ==========================================================================

create table private.push_subscriptions (
  endpoint text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user on private.push_subscriptions (user_id);
alter table private.push_subscriptions enable row level security;

-- endpoint הוא של המכשיר: אם אותו מכשיר מתחבר עם חשבון אחר — עובר אליו.
create or replace function public.save_push_subscription(
  p_actor uuid, p_endpoint text, p_p256dh text, p_auth text, p_user_agent text
) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  insert into private.push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
    values (p_endpoint, p_actor, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
  return true;
end;
$$;

create or replace function public.delete_push_subscription(p_actor uuid, p_endpoint text)
returns boolean
language sql security definer set search_path = ''
as $$
  with d as (delete from private.push_subscriptions where endpoint = p_endpoint and user_id = p_actor returning 1)
  select exists (select 1 from d);
$$;

-- מכשיר ששירות ההתראות אמר עליו "כבר לא קיים" (404/410) — ניקוי.
create or replace function public.remove_dead_push_subscription(p_endpoint text)
returns void
language sql security definer set search_path = ''
as $$
  delete from private.push_subscriptions where endpoint = p_endpoint;
$$;

-- כל מה שצריך כדי לשלוח התראה על פעולה של p_actor: השם שלו, הכותרות
-- הרלוונטיות (רק אם שייכות למרחב שלו), והמכשירים של בן/בת הזוג במרחב פתוח.
create or replace function public.push_context(
  p_actor uuid,
  p_idea_id uuid default null,
  p_plan_id uuid default null,
  p_memory_id uuid default null
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
    'planConfirmedByBoth', case when v_plan.id is null then false else (
      select count(*) = 2 from public.plan_confirmations c
       where c.plan_id = v_plan.id and c.plan_version = v_plan.version) end,
    'targets', (
      select coalesce(jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)), '[]'::jsonb)
        from public.space_members other
        join private.push_subscriptions ps on ps.user_id = other.user_id
       where other.space_id = v_space and other.user_id <> p_actor
    )
  );
end;
$$;

revoke all on function public.save_push_subscription(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.delete_push_subscription(uuid, text) from public, anon, authenticated;
revoke all on function public.remove_dead_push_subscription(text) from public, anon, authenticated;
revoke all on function public.push_context(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.save_push_subscription(uuid, text, text, text, text) to service_role;
grant execute on function public.delete_push_subscription(uuid, text) to service_role;
grant execute on function public.remove_dead_push_subscription(text) to service_role;
grant execute on function public.push_context(uuid, uuid, uuid, uuid) to service_role;
