-- Track edits from this release onward; do not infer historical editors from the creator.
alter table public.memories
  add column last_edited_by uuid,
  add column last_edited_at timestamptz,
  add constraint memories_last_editor_member_fk
    foreign key (space_id, last_edited_by) references public.space_members(space_id, user_id),
  add constraint memories_last_edit_pair
    check ((last_edited_by is null) = (last_edited_at is null));

create index memories_last_editor_idx on public.memories(space_id, last_edited_by)
  where last_edited_by is not null;

create or replace function public.update_memory(
  p_actor uuid,
  p_id uuid,
  p_expected_version integer,
  p_happened_on date,
  p_story text,
  p_title text,
  p_category text
) returns public.memories
language plpgsql security definer set search_path = ''
as $$
declare
  v_memory public.memories%rowtype;
  v_story text := coalesce(p_story, '');
  v_title text := btrim(coalesce(p_title, ''));
begin
  if p_happened_on is null or char_length(v_story) > 5000
     or char_length(v_title) not between 1 and 120
     or (p_category is not null and p_category not in ('food','outdoors','culture','trip','home','learning','other')) then
    raise exception 'INVALID_INPUT';
  end if;

  select mem.* into v_memory
    from public.memories mem
    join public.space_members m on m.space_id = mem.space_id
    join public.spaces s on s.id = mem.space_id
    where mem.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of mem;
  if v_memory.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_memory.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  if p_happened_on > (now() at time zone (
       select sp.timezone from public.spaces sp where sp.id = v_memory.space_id
     ))::date then
    raise exception 'INVALID_INPUT';
  end if;

  update public.memories set
    happened_on = p_happened_on,
    story = v_story,
    title = v_title,
    category = p_category,
    version = version + 1,
    updated_at = now(),
    last_edited_by = p_actor,
    last_edited_at = now()
  where id = p_id
  returning * into v_memory;

  return v_memory;
end;
$$;
revoke all on function public.update_memory(uuid,uuid,integer,date,text,text,text) from public, anon, authenticated;
grant execute on function public.update_memory(uuid,uuid,integer,date,text,text,text) to service_role;


-- Some deployed databases retain the old five-argument overload. Track its edits too,
-- without reintroducing it on databases where it was already removed.
do $migration$
begin
  if to_regprocedure('public.update_memory(uuid,uuid,integer,date,text)') is not null then
    execute $legacy$create or replace function public.update_memory(
  p_actor uuid,
  p_id uuid,
  p_expected_version integer,
  p_happened_on date,
  p_story text
) returns public.memories
language plpgsql security definer set search_path = ''
as $$
declare
  v_memory public.memories%rowtype;
  v_story text := coalesce(p_story, '');
begin
  if p_happened_on is null or char_length(v_story) > 5000 then
    raise exception 'INVALID_INPUT';
  end if;

  select mem.* into v_memory
    from public.memories mem
    join public.space_members m on m.space_id = mem.space_id
    join public.spaces s on s.id = mem.space_id
    where mem.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of mem;
  if v_memory.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_memory.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  -- "עתידי" לפי אזור הזמן של המרחב, לא לפי UTC של השרת: ב-00:30 בלילה
  -- בישראל (UTC+3) התאריך ב-UTC עדיין של אתמול, ובחירת "היום" הייתה
  -- נדחית בטעות כתאריך עתידי.
  if p_happened_on > (now() at time zone (
       select sp.timezone from public.spaces sp where sp.id = v_memory.space_id
     ))::date then
    raise exception 'INVALID_INPUT';
  end if;

  update public.memories set
    happened_on = p_happened_on,
    story = v_story,
    version = version + 1,
    updated_at = now(),
    last_edited_by = p_actor,
    last_edited_at = now()
  where id = p_id
  returning * into v_memory;

  return v_memory;
end;
$$;
revoke all on function public.update_memory(uuid,uuid,integer,date,text)
  from public, anon, authenticated;
grant execute on function public.update_memory(uuid,uuid,integer,date,text)
  to service_role;
$legacy$;
  end if;
end;
$migration$;

create or replace function private.home_memory_card(p_memory uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', mem.id,
    'planId', mem.plan_id,
    'title', mem.title,
    'category', mem.category,
    'happenedOn', mem.happened_on,
    'story', mem.story,
    'version', mem.version,
    'createdByName', btrim(pr.display_name),
    'lastEditedByName', (select nullif(btrim(editor.display_name), '') from public.profiles editor where editor.id = mem.last_edited_by),
    'lastEditedAt', mem.last_edited_at,
    'coverPhotoId', (
      select ph.id
        from public.memory_photos ph
       where ph.memory_id = mem.id and ph.status = 'ready'
       order by ph.sort_order, ph.created_at
       limit 1
    ),
    'photoCount', (
      select count(*)::int
        from public.memory_photos ph
       where ph.memory_id = mem.id and ph.status = 'ready'
    ),
    'place', coalesce(nullif(btrim(pl.meeting_place), ''), nullif(btrim(i.location_text), ''))
  )
    from public.memories mem
    left join public.plans pl on pl.id = mem.plan_id
    left join public.ideas i on i.id = pl.idea_id
    join public.profiles pr on pr.id = mem.created_by
   where mem.id = p_memory;
$$;

