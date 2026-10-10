-- ==========================================================================
-- 20261010120000_standalone_memories.sql
--
-- זיכרון בלי תוכנית (10.10.2026): דברים ספונטניים שלא תכננו מראש.
-- עד עכשיו זיכרון נוצר רק ב-complete_plan, והכותרת והקטגוריה שלו נגזרו
-- מהתוכנית ומהרעיון. מעכשיו הם שמורים בזיכרון עצמו:
--   * memories.plan_id הופך לאופציונלי (null = זיכרון עצמאי; unique ממשיך
--     להגן על תוכנית אחת = זיכרון אחד, כי null לא נחשב כפילות).
--   * memories.title (חובה) ו-memories.category (אופציונלית). זיכרונות קיימים
--     מקבלים אותם מהתוכנית/הרעיון שלהם, וטריגר ממלא אותם כש-complete_plan
--     יוצר זיכרון בלי לציין, כך ש-complete_plan לא משתנה.
--   * create_memory — RPC חדש. update_memory מקבל גם כותרת וקטגוריה.
--   * הפונקציות שקראו כותרת/קטגוריה דרך join על plans קוראות מהזיכרון.
-- ==========================================================================

alter table public.memories add column title text;
alter table public.memories add column category text
  check (category is null or category in ('food','outdoors','culture','trip','home','learning','other'));

update public.memories mem
   set title = pl.title,
       category = i.category
  from public.plans pl
  join public.ideas i on i.id = pl.idea_id
 where pl.id = mem.plan_id;

alter table public.memories alter column title set not null;
alter table public.memories add constraint memories_title_len check (char_length(title) between 1 and 120);
alter table public.memories alter column plan_id drop not null;

create or replace function private.memories_fill_from_plan()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.plan_id is not null and new.title is null then
    select pl.title, i.category into new.title, new.category
      from public.plans pl join public.ideas i on i.id = pl.idea_id
     where pl.id = new.plan_id;
  end if;
  return new;
end;
$$;
revoke all on function private.memories_fill_from_plan() from public, anon, authenticated;
create trigger memories_fill_from_plan before insert on public.memories
  for each row execute function private.memories_fill_from_plan();

-- יצירת זיכרון עצמאי. אותו דפוס כמו create_plan: service_role בלבד, p_actor
-- מהשרת, idempotency לפי request_id, תאריך עתידי נדחה (לפי אזור הזמן של המרחב).
create or replace function public.create_memory(
  p_actor uuid,
  p_request_id uuid,
  p_title text,
  p_happened_on date,
  p_story text,
  p_category text
) returns public.memories
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_tz text;
  v_title text := btrim(coalesce(p_title, ''));
  v_story text := coalesce(p_story, '');
  v_memory public.memories%rowtype;
  v_existing_resource uuid;
  v_existing_hash text;
  v_payload_hash text := md5(
    v_title || '|' || coalesce(p_happened_on::text, '') || '|' || v_story || '|' || coalesce(p_category, '')
  );
begin
  if char_length(v_title) not between 1 and 120 or p_happened_on is null
     or char_length(v_story) > 5000
     or (p_category is not null and p_category not in ('food','outdoors','culture','trip','home','learning','other')) then
    raise exception 'INVALID_INPUT';
  end if;

  select m.space_id, s.timezone into v_space, v_tz
    from public.space_members m
    join public.spaces s on s.id = m.space_id
    where m.user_id = p_actor and s.status = 'open'
    for update of s;
  if v_space is null then
    raise exception 'NOT_FOUND';
  end if;

  if p_happened_on > (now() at time zone v_tz)::date then
    raise exception 'INVALID_INPUT';
  end if;

  select resource_id, payload_hash into v_existing_resource, v_existing_hash
    from private.mutation_keys
    where actor_id = p_actor and operation = 'create_memory' and request_id = p_request_id;
  if found then
    if v_existing_hash = v_payload_hash and v_existing_resource is not null then
      select * into v_memory from public.memories where id = v_existing_resource;
      return v_memory;
    end if;
    raise exception 'VERSION_CONFLICT';
  end if;

  insert into public.memories (space_id, plan_id, created_by, happened_on, story, title, category)
    values (v_space, null, p_actor, p_happened_on, v_story, v_title, p_category)
    returning * into v_memory;

  insert into private.mutation_keys (actor_id, operation, request_id, payload_hash, resource_id)
    values (p_actor, 'create_memory', p_request_id, v_payload_hash, v_memory.id);

  return v_memory;
end;
$$;
revoke all on function public.create_memory(uuid,uuid,text,date,text,text) from public, anon, authenticated;
grant execute on function public.create_memory(uuid,uuid,text,date,text,text) to service_role;

-- update_memory: גם כותרת וקטגוריה (0016 + שני פרמטרים).
drop function public.update_memory(uuid, uuid, integer, date, text);
create function public.update_memory(
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
    updated_at = now()
  where id = p_id
  returning * into v_memory;

  return v_memory;
end;
$$;
revoke all on function public.update_memory(uuid,uuid,integer,date,text,text,text) from public, anon, authenticated;
grant execute on function public.update_memory(uuid,uuid,integer,date,text,text,text) to service_role;

-- כרטיס זיכרון בבית: כותרת/קטגוריה מהזיכרון; מקום מהתוכנית/הרעיון אם יש.
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

-- "לפני שנה בדיוק" (התראה יומית): הכותרת מהזיכרון, בלי join על תוכניות.
create or replace function public.on_this_day_targets(p_today date)
returns table (space_id uuid, memory_id uuid, title text, years_ago int, has_photo boolean, targets jsonb)
language sql stable security definer set search_path = ''
as $$
  select mem.space_id,
         mem.id,
         mem.title,
         (extract(year from p_today) - extract(year from mem.happened_on))::int,
         exists (select 1 from public.memory_photos ph where ph.memory_id = mem.id and ph.status = 'ready'),
         (select coalesce(jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)), '[]'::jsonb)
            from public.space_members m join private.push_subscriptions ps on ps.user_id = m.user_id
           where m.space_id = mem.space_id)
    from public.memories mem
    join public.spaces s on s.id = mem.space_id and s.status = 'open'
   where mem.happened_on < p_today
     and extract(year from mem.happened_on) < extract(year from p_today)
     and (
       to_char(mem.happened_on, 'MM-DD') = to_char(p_today, 'MM-DD')
       or (to_char(p_today, 'MM-DD') = '02-28'
           and to_char(mem.happened_on, 'MM-DD') = '02-29'
           and extract(day from (date_trunc('year', p_today) + interval '1 month 28 days')) <> 29)
     );
$$;

-- push_context: זיכרון עצמאי (בלי תוכנית) מחזיר את כותרת הזיכרון כ-planTitle,
-- כך שהתראת "תמונות חדשות" עובדת גם בלי תוכנית.
create or replace function public.push_context(
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
  v_title text;
  v_starts timestamptz;
begin
  select m.space_id, s.status into v_space, v_status
    from public.space_members m join public.spaces s on s.id = m.space_id
   where m.user_id = p_actor;
  if v_space is null then
    return null;
  end if;

  if p_memory_id is not null then
    select mem.title, pl.starts_at into v_title, v_starts
      from public.memories mem left join public.plans pl on pl.id = mem.plan_id
     where mem.id = p_memory_id and mem.space_id = v_space;
  elsif p_plan_id is not null then
    select pl.title, pl.starts_at into v_title, v_starts
      from public.plans pl where pl.id = p_plan_id and pl.space_id = v_space;
  end if;

  return jsonb_build_object(
    'spaceStatus', v_status,
    'actorName', (select display_name from public.profiles where id = p_actor),
    'ideaTitle', (select title from public.ideas where id = p_idea_id and space_id = v_space),
    'planTitle', v_title,
    'planStartsAt', v_starts,
    'targets', (
      select coalesce(jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)), '[]'::jsonb)
        from public.space_members other
        join private.push_subscriptions ps on ps.user_id = other.user_id
       where other.space_id = v_space and (p_include_actor or other.user_id <> p_actor)
    )
  );
end;
$$;

-- גיבוי: זיכרונות עצמאיים נכללים (כותרת וקטגוריה מהזיכרון).
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
               'title', mem.title,
               'category', mem.category,
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
