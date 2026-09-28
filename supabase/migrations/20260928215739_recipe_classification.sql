-- Optional classifications; existing recipes remain unclassified.
-- Keep save_recipe for older clients; its updates preserve these new fields.
alter table public.recipes
  add column course text check (course in ('main','side','salad','soup','bread_pastry','dessert','sauce_spread','other')),
  add column classification text check (classification in ('meat','dairy','pareve'));

create function public.save_classified_recipe(p_actor uuid, p_id uuid, p_expected_version integer,
  p_title text, p_source_url text, p_body text, p_note text, p_course text, p_classification text)
returns public.recipes language plpgsql security invoker set search_path = '' as $$
declare
  v_space uuid;
  v_recipe public.recipes;
  v_title text := btrim(p_title);
  v_url text := nullif(btrim(p_source_url), '');
  v_body text := btrim(coalesce(p_body, ''));
  v_note text := btrim(coalesce(p_note, ''));
begin
  if (p_course is not null and p_course not in ('main','side','salad','soup','bread_pastry','dessert','sauce_spread','other'))
     or (p_classification is not null and p_classification not in ('meat','dairy','pareve'))
     or p_id is null or v_title is null or char_length(v_title) not between 1 and 120
     or char_length(v_body) > 20000 or char_length(v_note) > 3000
     or (v_url is not null and (char_length(v_url) > 2048 or v_url !~ '^https://[^[:space:]]+$'))
     or (p_expected_version is not null and p_expected_version < 1) then
    raise exception 'INVALID_INPUT';
  end if;
  select s.id into v_space from public.spaces s join public.space_members m on m.space_id=s.id
    where m.user_id=p_actor and s.status='open' for share of s, m;
  if v_space is null then raise exception 'NOT_MEMBER'; end if;
  -- Serializes retries with the same generated recipe id, without locking unrelated recipes.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into v_recipe from public.recipes where id=p_id for update;
  if p_expected_version is null then
    if v_recipe.id is not null then
      if v_recipe.space_id=v_space and v_recipe.title=v_title and v_recipe.source_url is not distinct from v_url
         and v_recipe.body=v_body and v_recipe.note=v_note
         and v_recipe.course is not distinct from p_course and v_recipe.classification is not distinct from p_classification then return v_recipe; end if;
      raise exception 'VERSION_CONFLICT';
    end if;
    insert into public.recipes(id,space_id,title,source_url,body,note,course,classification)
      values(p_id,v_space,v_title,v_url,v_body,v_note,p_course,p_classification) returning * into v_recipe;
  else
    if v_recipe.id is null or v_recipe.space_id<>v_space then raise exception 'NOT_FOUND'; end if;
    if v_recipe.version<>p_expected_version then raise exception 'VERSION_CONFLICT'; end if;
    update public.recipes set title=v_title,source_url=v_url,body=v_body,note=v_note,course=p_course,classification=p_classification,
      version=version+1,updated_at=now() where id=p_id returning * into v_recipe;
  end if;
  return v_recipe;
end;
$$;
revoke all on function public.save_classified_recipe(uuid,uuid,integer,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.save_classified_recipe(uuid,uuid,integer,text,text,text,text,text,text) to service_role;

-- Include recipes in the existing authorized backup, including closed-space grace period.
create or replace function public.export_space_data(p_actor uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_space uuid := private.export_space_for(p_actor);
begin
  if v_space is null then
    raise exception 'NOT_FOUND';
  end if;

  return jsonb_build_object(
    'recipes', (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'sourceUrl',r.source_url,'body',r.body,'note',r.note,'course',r.course,'classification',r.classification,'createdAt',r.created_at) order by r.created_at,r.id), '[]'::jsonb) from public.recipes r where r.space_id=v_space),
    'members', (
      select coalesce(jsonb_agg(p.display_name order by m.slot), '[]'::jsonb)
        from public.space_members m join public.profiles p on p.id = m.user_id
       where m.space_id = v_space
    ),
    'memories', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', mem.id,
               'title', pl.title,
               'happenedOn', mem.happened_on,
               'story', mem.story,
               'createdBy', (select display_name from public.profiles where id = mem.created_by),
               'photos', (
                 select coalesce(jsonb_agg(jsonb_build_object(
                          'id', ph.id,
                          'uploadedBy', (select display_name from public.profiles where id = ph.uploaded_by)
                        ) order by ph.sort_order, ph.created_at), '[]'::jsonb)
                   from public.memory_photos ph
                  where ph.memory_id = mem.id and ph.status = 'ready'
               )
             ) order by mem.happened_on desc, mem.id desc), '[]'::jsonb)
        from public.memories mem
        join public.plans pl on pl.id = mem.plan_id
       where mem.space_id = v_space
    ),
    'ideas', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'title', i.title,
               'category', i.category,
               'description', i.description,
               'location', i.location_text,
               'link', i.source_url,
               'status', i.status,
               'createdAt', i.created_at,
               'createdBy', (select display_name from public.profiles where id = i.created_by)
             ) order by i.created_at), '[]'::jsonb)
        from public.ideas i
       where i.space_id = v_space
    )
  );
end;
$$;
