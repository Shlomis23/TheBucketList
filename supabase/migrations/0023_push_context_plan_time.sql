-- ==========================================================================
-- 0023_push_context_plan_time.sql
-- בלי שלב אישור לתוכניות (26.9): ההתראה על תוכנית חדשה/עדכון מציגה את
-- המועד עצמו ("פיקניק בטבע · שבת 19:30"), במקום "מחכה לאישור שלך".
-- push_context מחזיר עכשיו גם planStartsAt.
-- ==========================================================================
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
    'planStartsAt', v_plan.starts_at,
    'targets', (
      select coalesce(jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)), '[]'::jsonb)
        from public.space_members other
        join private.push_subscriptions ps on ps.user_id = other.user_id
       where other.space_id = v_space and other.user_id <> p_actor
    )
  );
end;
$$;
