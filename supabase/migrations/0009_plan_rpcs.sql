-- ==========================================================================
-- 0009_plan_rpcs.sql
--
-- RPC שירות ל-F6 (spec סעיף 5, 13.2, 7): createPlan, updatePlan, confirmPlan,
-- unconfirmPlan, cancelPlan, completePlan. כולן service_role בלבד — p_actor
-- מגיע מהשרת (getVerifiedUserId), לא מהטופס של הלקוח.
--
-- קריאות (listPlans, getPlan) לא צריכות RPC — member_read policy כבר
-- מכסה plans/plan_confirmations (ראו 0002_rls.sql), ו-profiles_read מכסה
-- קריאת display_name של בן/בת הזוג. "מאושר לשנינו" הוא ערך נגזר, לא עמודה
-- שמורה (ראו spec סעיף 7): פלאן נחשב מאושר כאשר יש שתי שורות
-- plan_confirmations לאותו plan_id עם plan_version = הגרסה הנוכחית של plans.
-- שינוי פרטי תוכנית (updatePlan) מעלה version בלי למחוק אישורים קודמים —
-- הם פשוט מפסיקים "לספור" כי plan_version שלהם כבר לא תואם.
-- ==========================================================================

create or replace function public.create_plan(
  p_actor uuid,
  p_request_id uuid,
  p_idea_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text,
  p_meeting_place text,
  p_notes text,
  p_budget_minor bigint
) returns public.plans
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_title text;
  v_plan public.plans%rowtype;
  v_existing_resource uuid;
  v_existing_hash text;
  v_payload_hash text := md5(
    coalesce(p_idea_id::text,'') || '|' || coalesce(p_starts_at::text,'') || '|' ||
    coalesce(p_meeting_place,'') || '|' || coalesce(p_notes,'')
  );
  v_timezone text := nullif(btrim(coalesce(p_timezone,'')), '');
begin
  if p_ends_at is not null and (p_starts_at is null or p_ends_at <= p_starts_at) then
    raise exception 'INVALID_INPUT';
  end if;

  select i.space_id, i.title into v_space, v_title
    from public.ideas i
    join public.space_members m on m.space_id = i.space_id
    join public.spaces s on s.id = i.space_id
    where i.id = p_idea_id and m.user_id = p_actor and s.status = 'open' and i.status = 'active'
    for update of s;
  if v_space is null then
    raise exception 'NOT_FOUND';
  end if;

  -- idempotency: אותו request_id + payload זהה מחזיר את אותה תוצאה;
  -- אותו request_id + payload שונה הוא 409 (ראו create_idea לתבנית זהה).
  select resource_id, payload_hash into v_existing_resource, v_existing_hash
    from private.mutation_keys
    where actor_id = p_actor and operation = 'create_plan' and request_id = p_request_id;
  if found then
    if v_existing_hash = v_payload_hash and v_existing_resource is not null then
      select * into v_plan from public.plans where id = v_existing_resource;
      return v_plan;
    end if;
    raise exception 'VERSION_CONFLICT';
  end if;

  begin
    insert into public.plans (
      space_id, idea_id, created_by, title, starts_at, ends_at,
      timezone, meeting_place, notes, budget_minor
    ) values (
      v_space, p_idea_id, p_actor, v_title, p_starts_at, p_ends_at,
      coalesce(v_timezone, 'Asia/Jerusalem'), nullif(btrim(coalesce(p_meeting_place,'')), ''),
      coalesce(p_notes, ''), p_budget_minor
    ) returning * into v_plan;
  exception when unique_violation then
    -- one_active_plan_per_idea (0001_schema.sql): כבר יש תוכנית proposed לרעיון הזה.
    raise exception 'ACTIVE_PLAN_EXISTS';
  end;

  insert into private.mutation_keys (actor_id, operation, request_id, payload_hash, resource_id)
    values (p_actor, 'create_plan', p_request_id, v_payload_hash, v_plan.id);

  return v_plan;
end;
$$;
revoke all on function public.create_plan(uuid,uuid,uuid,timestamptz,timestamptz,text,text,text,bigint)
  from public, anon, authenticated;
grant execute on function public.create_plan(uuid,uuid,uuid,timestamptz,timestamptz,text,text,text,bigint)
  to service_role;

-- updatePlan — proposed בלבד; version+1; אישורים קודמים מפסיקים לתקף כי
-- plan_version שלהם נשאר מאחור (ראו הערת ראש הקובץ).
create or replace function public.update_plan(
  p_actor uuid,
  p_id uuid,
  p_expected_version integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text,
  p_meeting_place text,
  p_notes text,
  p_budget_minor bigint
) returns public.plans
language plpgsql security definer set search_path = ''
as $$
declare
  v_plan public.plans%rowtype;
  v_timezone text := nullif(btrim(coalesce(p_timezone,'')), '');
begin
  if p_ends_at is not null and (p_starts_at is null or p_ends_at <= p_starts_at) then
    raise exception 'INVALID_INPUT';
  end if;

  select p.* into v_plan
    from public.plans p
    join public.space_members m on m.space_id = p.space_id
    join public.spaces s on s.id = p.space_id
    where p.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of p;
  if v_plan.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_plan.status <> 'proposed' then
    raise exception 'VERSION_CONFLICT';
  end if;
  if v_plan.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  update public.plans set
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    timezone = coalesce(v_timezone, 'Asia/Jerusalem'),
    meeting_place = nullif(btrim(coalesce(p_meeting_place,'')), ''),
    notes = coalesce(p_notes, ''),
    budget_minor = p_budget_minor,
    version = version + 1,
    updated_at = now()
  where id = p_id
  returning * into v_plan;

  return v_plan;
end;
$$;
revoke all on function public.update_plan(uuid,uuid,integer,timestamptz,timestamptz,text,text,text,bigint)
  from public, anon, authenticated;
grant execute on function public.update_plan(uuid,uuid,integer,timestamptz,timestamptz,text,text,text,bigint)
  to service_role;

-- confirmPlan — proposed; startsAt קיים; שני חברים במרחב; upsert אישור
-- actor לגרסה הנעולה (plan_version = הגרסה הנוכחית של plans).
create or replace function public.confirm_plan(
  p_actor uuid, p_id uuid, p_expected_version integer
) returns table (status text, version integer, is_confirmed_by_both boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  v_plan public.plans%rowtype;
  v_member_count integer;
begin
  select p.* into v_plan
    from public.plans p
    join public.space_members m on m.space_id = p.space_id
    join public.spaces s on s.id = p.space_id
    where p.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of p;
  if v_plan.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_plan.status <> 'proposed' then
    raise exception 'VERSION_CONFLICT';
  end if;
  if v_plan.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;
  if v_plan.starts_at is null then
    raise exception 'INVALID_INPUT';
  end if;

  select count(*) into v_member_count from public.space_members where space_id = v_plan.space_id;
  if v_member_count < 2 then
    raise exception 'NOT_ENOUGH_MEMBERS';
  end if;

  insert into public.plan_confirmations (space_id, plan_id, user_id, plan_version)
    values (v_plan.space_id, p_id, p_actor, v_plan.version)
    on conflict (plan_id, user_id)
    do update set plan_version = excluded.plan_version, confirmed_at = now();

  return query
    select v_plan.status, v_plan.version,
      (select count(*) from public.plan_confirmations
       where plan_id = p_id and plan_version = v_plan.version) = 2;
end;
$$;
revoke all on function public.confirm_plan(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.confirm_plan(uuid,uuid,integer) to service_role;

-- unconfirmPlan — actor מסיר רק את האישור שלו; לא חושף את מצב האישור
-- של בן/בת הזוג מעבר ל-count הכללי (זהה למה ש-getPlan מחזיר ממילא).
create or replace function public.unconfirm_plan(
  p_actor uuid, p_id uuid, p_expected_version integer
) returns table (status text, version integer, is_confirmed_by_both boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  v_plan public.plans%rowtype;
begin
  select p.* into v_plan
    from public.plans p
    join public.space_members m on m.space_id = p.space_id
    join public.spaces s on s.id = p.space_id
    where p.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of p;
  if v_plan.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_plan.status <> 'proposed' then
    raise exception 'VERSION_CONFLICT';
  end if;
  if v_plan.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  delete from public.plan_confirmations where plan_id = p_id and user_id = p_actor;

  return query
    select v_plan.status, v_plan.version,
      (select count(*) from public.plan_confirmations
       where plan_id = p_id and plan_version = v_plan.version) = 2;
end;
$$;
revoke all on function public.unconfirm_plan(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.unconfirm_plan(uuid,uuid,integer) to service_role;

-- cancelPlan — "נדחה למועד אחר" הוא updatePlan, לא זה; זו ביטול ממשי.
-- תוכנית מבוטלת נשמרת (לא נמחקת), כנדרש בסעיף 6.1.
create or replace function public.cancel_plan(
  p_actor uuid, p_id uuid, p_expected_version integer
) returns public.plans
language plpgsql security definer set search_path = ''
as $$
declare
  v_plan public.plans%rowtype;
begin
  select p.* into v_plan
    from public.plans p
    join public.space_members m on m.space_id = p.space_id
    join public.spaces s on s.id = p.space_id
    where p.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of p;
  if v_plan.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_plan.status <> 'proposed' then
    raise exception 'VERSION_CONFLICT';
  end if;
  if v_plan.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  update public.plans set status = 'cancelled', version = version + 1, updated_at = now()
    where id = p_id
    returning * into v_plan;

  return v_plan;
end;
$$;
revoke all on function public.cancel_plan(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.cancel_plan(uuid,uuid,integer) to service_role;

-- completePlan — F7 בזעיר אנפין: proposed בלבד; השלמה + יצירת זיכרון
-- באותה טרנזקציה (סעיף 7, 13.2). מותר להשלים בלי אישורים/בלי מועד, כל עוד
-- הוזן happenedOn (סעיף 13.2: "השלמה ללא שני אישורים"). idempotent על
-- request_id; מוגן גם ב-unique על memories.plan_id (סעיף 7 בטבלת memories).
create or replace function public.complete_plan(
  p_actor uuid,
  p_request_id uuid,
  p_id uuid,
  p_expected_version integer,
  p_happened_on date,
  p_story text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_plan public.plans%rowtype;
  v_memory_id uuid;
  v_existing_resource uuid;
  v_existing_hash text;
  v_payload_hash text := md5(coalesce(p_id::text,'') || '|' || coalesce(p_happened_on::text,''));
begin
  if p_happened_on is null then
    raise exception 'INVALID_INPUT';
  end if;

  select p.* into v_plan
    from public.plans p
    join public.space_members m on m.space_id = p.space_id
    join public.spaces s on s.id = p.space_id
    where p.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of p;
  if v_plan.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_plan.status <> 'proposed' then
    raise exception 'VERSION_CONFLICT';
  end if;
  if v_plan.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  select resource_id, payload_hash into v_existing_resource, v_existing_hash
    from private.mutation_keys
    where actor_id = p_actor and operation = 'complete_plan' and request_id = p_request_id;
  if found then
    if v_existing_hash = v_payload_hash and v_existing_resource is not null then
      return v_existing_resource;
    end if;
    raise exception 'VERSION_CONFLICT';
  end if;

  update public.plans set status = 'completed', version = version + 1, updated_at = now()
    where id = p_id;

  begin
    insert into public.memories (space_id, plan_id, created_by, happened_on, story)
      values (v_plan.space_id, p_id, p_actor, p_happened_on, coalesce(p_story, ''))
      returning id into v_memory_id;
  exception when unique_violation then
    select id into v_memory_id from public.memories where plan_id = p_id;
  end;

  insert into private.mutation_keys (actor_id, operation, request_id, payload_hash, resource_id)
    values (p_actor, 'complete_plan', p_request_id, v_payload_hash, v_memory_id);

  return v_memory_id;
end;
$$;
revoke all on function public.complete_plan(uuid,uuid,uuid,integer,date,text)
  from public, anon, authenticated;
grant execute on function public.complete_plan(uuid,uuid,uuid,integer,date,text)
  to service_role;
