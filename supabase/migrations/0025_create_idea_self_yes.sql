-- ==========================================================================
-- 0025_create_idea_self_yes.sql
--
-- "כן" כברירת מחדל למי שמוסיף רעיון (שלומי, 25.9 — אופציה ב). באפיון המקורי
-- (AC03) נאסר yes אוטומטי; ההחלטה החדשה: בטופס יש תיבה "גם אני רוצה את זה"
-- מסומנת מראש, ואפשר להוריד אותה ("זה בשבילך"). התגובה נוצרת באותה
-- טרנזקציה כמו הרעיון. כך "כן" של בן/בת הזוג יוצר מאצ' מיד.
-- ==========================================================================

drop function public.create_idea(uuid, uuid, text, text, text, text, text, bigint, integer, text);

create function public.create_idea(
  p_actor uuid, p_request_id uuid, p_title text, p_description text, p_category text,
  p_location_text text, p_source_url text, p_cost_minor bigint, p_duration_minutes integer,
  p_place_id text default null,
  p_self_yes boolean default false
) returns public.ideas
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_title text := btrim(p_title);
  v_location text := nullif(btrim(coalesce(p_location_text, '')), '');
  v_idea public.ideas%rowtype;
  v_existing_resource uuid;
  v_existing_hash text;
  v_payload_hash text := md5(coalesce(v_title,'') || '|' || coalesce(p_category,''));
begin
  if v_title is null or char_length(v_title) < 1 or char_length(v_title) > 120 then
    raise exception 'INVALID_INPUT';
  end if;

  select m.space_id into v_space
    from public.space_members m join public.spaces s on s.id = m.space_id
    where m.user_id = p_actor and s.status = 'open'
    for update of s;
  if v_space is null then
    raise exception 'NOT_MEMBER';
  end if;

  select resource_id, payload_hash into v_existing_resource, v_existing_hash
    from private.mutation_keys
    where actor_id = p_actor and operation = 'create_idea' and request_id = p_request_id;
  if found then
    if v_existing_hash = v_payload_hash and v_existing_resource is not null then
      select * into v_idea from public.ideas where id = v_existing_resource;
      return v_idea;
    end if;
    raise exception 'VERSION_CONFLICT';
  end if;

  insert into public.ideas (
    space_id, created_by, title, description, category,
    location_text, place_id, source_url, cost_minor, duration_minutes
  ) values (
    v_space, p_actor, v_title, coalesce(p_description, ''), coalesce(p_category, 'other'),
    v_location,
    case when v_location is null then null else nullif(btrim(coalesce(p_place_id, '')), '') end,
    nullif(btrim(coalesce(p_source_url, '')), ''),
    p_cost_minor, p_duration_minutes
  ) returning * into v_idea;

  if p_self_yes then
    insert into public.idea_reactions (space_id, idea_id, user_id, preference)
      values (v_space, v_idea.id, p_actor, 'yes');
  end if;

  insert into private.mutation_keys (actor_id, operation, request_id, payload_hash, resource_id)
    values (p_actor, 'create_idea', p_request_id, v_payload_hash, v_idea.id);

  return v_idea;
end;
$$;

revoke all on function public.create_idea(uuid, uuid, text, text, text, text, text, bigint, integer, text, boolean) from public, anon, authenticated;
grant execute on function public.create_idea(uuid, uuid, text, text, text, text, text, bigint, integer, text, boolean) to service_role;
