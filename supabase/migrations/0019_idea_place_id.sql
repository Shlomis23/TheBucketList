-- ==========================================================================
-- 0019_idea_place_id.sql
--
-- מקום מ-Google Places (שלומי אישר 25.9, מפתח ב-Vercel בלבד). לרעיון נשמר
-- place_id לצד location_text: הטקסט נשאר המקור לתצוגה ולסינון (בחירת רעיון,
-- חיפוש), וה-place_id מאפשר ניווט מדויק (Google Maps query_place_id, ו-Waze
-- לפי קואורדינטות שנשלפות בזמן הלחיצה — לא נשמרות, לפי תנאי Google).
-- place_id הוא השדה היחיד מ-Places שמותר לשמור ללא הגבלת זמן.
--
-- רעיונות קיימים / טקסט חופשי: place_id = null, והכול עובד כמו קודם.
-- ==========================================================================

alter table public.ideas
  add column place_id text,
  add constraint ideas_place_id_format check (
    place_id is null or (char_length(place_id) between 1 and 300 and place_id ~ '^[A-Za-z0-9_-]+$')
  ),
  add constraint ideas_place_id_needs_text check (place_id is null or location_text is not null);

-- החתימות משתנות (פרמטר נוסף) — מוחקים את הישנות כדי שלא יישאר overload.
drop function public.create_idea(uuid, uuid, text, text, text, text, text, bigint, integer);
drop function public.update_idea(uuid, uuid, integer, text, text, text, text, text, bigint, integer);

create function public.create_idea(
  p_actor uuid, p_request_id uuid, p_title text, p_description text, p_category text,
  p_location_text text, p_source_url text, p_cost_minor bigint, p_duration_minutes integer,
  p_place_id text default null
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

  insert into private.mutation_keys (actor_id, operation, request_id, payload_hash, resource_id)
    values (p_actor, 'create_idea', p_request_id, v_payload_hash, v_idea.id);

  return v_idea;
end;
$$;

create function public.update_idea(
  p_actor uuid, p_id uuid, p_expected_version integer, p_title text, p_description text,
  p_category text, p_location_text text, p_source_url text, p_cost_minor bigint,
  p_duration_minutes integer, p_place_id text default null
) returns public.ideas
language plpgsql security definer set search_path = ''
as $$
declare
  v_idea public.ideas%rowtype;
  v_title text := btrim(p_title);
  v_location text := nullif(btrim(coalesce(p_location_text, '')), '');
begin
  if v_title is null or char_length(v_title) < 1 or char_length(v_title) > 120 then
    raise exception 'INVALID_INPUT';
  end if;

  select i.* into v_idea
    from public.ideas i
    join public.space_members m on m.space_id = i.space_id
    join public.spaces s on s.id = i.space_id
    where i.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of i;
  if v_idea.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_idea.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  update public.ideas set
    title = v_title,
    description = coalesce(p_description, ''),
    category = coalesce(p_category, 'other'),
    location_text = v_location,
    place_id = case when v_location is null then null else nullif(btrim(coalesce(p_place_id, '')), '') end,
    source_url = nullif(btrim(coalesce(p_source_url, '')), ''),
    cost_minor = p_cost_minor,
    duration_minutes = p_duration_minutes,
    version = version + 1,
    updated_at = now()
  where id = p_id
  returning * into v_idea;

  return v_idea;
end;
$$;

revoke all on function public.create_idea(uuid, uuid, text, text, text, text, text, bigint, integer, text) from public, anon, authenticated;
revoke all on function public.update_idea(uuid, uuid, integer, text, text, text, text, text, bigint, integer, text) from public, anon, authenticated;
grant execute on function public.create_idea(uuid, uuid, text, text, text, text, text, bigint, integer, text) to service_role;
grant execute on function public.update_idea(uuid, uuid, integer, text, text, text, text, text, bigint, integer, text) to service_role;
