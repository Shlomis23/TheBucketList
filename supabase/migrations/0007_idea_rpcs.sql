-- ==========================================================================
-- 0007_idea_rpcs.sql
--
-- RPC שירות ל-F3 (spec סעיף 5, 13.2): createIdea, setReaction.
-- שתיהן service_role בלבד — p_actor מגיע מהשרת (getVerifiedUserId), לא
-- מהטופס של הלקוח. קריאות (listIdeas, "התגובה שלי") לא צריכות RPC — הן
-- הולכות דרך ה-client של המשתמש ונשענות על RLS (member_read /
-- own_reaction_read, ראו 0002_rls.sql).
-- ==========================================================================

create or replace function public.create_idea(
  p_actor uuid,
  p_request_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_location_text text,
  p_source_url text,
  p_cost_minor bigint,
  p_duration_minutes integer
) returns public.ideas
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_title text := btrim(p_title);
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

  -- idempotency: אותו request_id + payload זהה מחזיר את אותה תוצאה;
  -- אותו request_id + payload שונה הוא 409 (ראו create_space לתבנית זהה).
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
    location_text, source_url, cost_minor, duration_minutes
  ) values (
    v_space, p_actor, v_title, coalesce(p_description, ''), coalesce(p_category, 'other'),
    nullif(btrim(coalesce(p_location_text, '')), ''),
    nullif(btrim(coalesce(p_source_url, '')), ''),
    p_cost_minor, p_duration_minutes
  ) returning * into v_idea;

  insert into private.mutation_keys (actor_id, operation, request_id, payload_hash, resource_id)
    values (p_actor, 'create_idea', p_request_id, v_payload_hash, v_idea.id);

  return v_idea;
end;
$$;
revoke all on function public.create_idea(uuid,uuid,text,text,text,text,text,bigint,integer)
  from public, anon, authenticated;
grant execute on function public.create_idea(uuid,uuid,text,text,text,text,text,bigint,integer)
  to service_role;

-- setReaction — preference NULL מוחק את התגובה. לעולם לא חושפת את תגובת
-- הצד השני; is_match מחושב מחדש מתוך idea_reactions באותה טרנזקציה.
create or replace function public.set_reaction(
  p_actor uuid, p_idea_id uuid, p_preference text
) returns table (preference text, is_match boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
begin
  if p_preference is not null and p_preference not in ('yes','maybe','no') then
    raise exception 'INVALID_INPUT';
  end if;

  select i.space_id into v_space
    from public.ideas i
    join public.space_members m on m.space_id = i.space_id
    join public.spaces s on s.id = i.space_id
    where i.id = p_idea_id and m.user_id = p_actor and s.status = 'open' and i.status = 'active';
  if v_space is null then
    raise exception 'NOT_FOUND';
  end if;

  if p_preference is null then
    delete from public.idea_reactions where idea_id = p_idea_id and user_id = p_actor;
  else
    insert into public.idea_reactions (space_id, idea_id, user_id, preference)
      values (v_space, p_idea_id, p_actor, p_preference)
      on conflict (idea_id, user_id)
      do update set preference = excluded.preference, updated_at = now();
  end if;

  return query
    select p_preference,
      (select count(*) from public.space_members where space_id = v_space) = 2
      and (select count(*) from public.idea_reactions
           where idea_id = p_idea_id and preference = 'yes') = 2;
end;
$$;
revoke all on function public.set_reaction(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.set_reaction(uuid,uuid,text) to service_role;
