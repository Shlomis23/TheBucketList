-- מסך הבית נקרא לעיתים קרובות (פתיחה, חזרה לאפליקציה וניווט לטאב הבית).
-- במקום 15+ בקשות Data API נפרדות, שלוש פונקציות צרות מחזירות את התקציר,
-- הזיכרון האחרון ו"לפני שנה". כולן זמינות רק ל-service_role ובודקות שה-actor
-- חבר במרחב פתוח לפני החזרת מידע.

create or replace function private.home_memory_card(p_memory uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', mem.id,
    'planId', mem.plan_id,
    'title', pl.title,
    'category', i.category,
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
    join public.plans pl on pl.id = mem.plan_id
    join public.ideas i on i.id = pl.idea_id
    join public.profiles pr on pr.id = mem.created_by
   where mem.id = p_memory;
$$;

create or replace function public.home_summary(p_actor uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with mine as (
    select m.space_id
      from public.space_members m
      join public.spaces s on s.id = m.space_id and s.status = 'open'
     where m.user_id = p_actor
     limit 1
  ),
  members as (
    select m.user_id
      from public.space_members m
      join mine on mine.space_id = m.space_id
  ),
  proposed as (
    select p.*, i.category, i.location_text, i.place_id,
           case
             when p.ends_at is not null then p.ends_at < now()
             when p.starts_at is not null then p.starts_at + interval '3 hours' < now()
             else false
           end as is_past
      from public.plans p
      join mine on mine.space_id = p.space_id
      join public.ideas i on i.id = p.idea_id
     where p.status = 'proposed'
  ),
  unanswered as (
    select i.id, i.title, i.category, i.created_at
      from public.ideas i
      join mine on mine.space_id = i.space_id
     where i.status = 'active'
       and i.created_by <> p_actor
       and not exists (
         select 1 from public.idea_reactions r
          where r.idea_id = i.id and r.user_id = p_actor
       )
  )
  select jsonb_build_object(
    'displayName', coalesce((select pr.display_name from public.profiles pr where pr.id = p_actor), ''),
    'partnerName', (
      select nullif(btrim(pr.display_name), '')
        from members m
        join public.profiles pr on pr.id = m.user_id
       where m.user_id <> p_actor
       limit 1
    ),
    'ideasCount', (
      select count(*)::int
        from public.ideas i
        join mine on mine.space_id = i.space_id
       where i.status = 'active'
    ),
    'matchesCount', (select count(*)::int from private.open_space_matches(p_actor)),
    'waitingForPartner', (select count(*) from members) < 2,
    'upcomingPlan', (
      select jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'startsAt', p.starts_at,
        'meetingPlace', p.meeting_place,
        'ideaCategory', p.category,
        'navPlace', coalesce(nullif(btrim(p.meeting_place), ''), nullif(btrim(p.location_text), '')),
        'navPlaceId', case when nullif(btrim(p.meeting_place), '') is null then p.place_id else null end
      )
        from proposed p
       where not p.is_past
       order by p.starts_at asc nulls last
       limit 1
    ),
    'partnerNewIdeas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id,
        'title', x.title,
        'category', x.category,
        'createdAt', x.created_at
      ) order by x.created_at desc)
        from (
          select * from unanswered order by created_at desc limit 3
        ) x
    ), '[]'::jsonb),
    'partnerNewIdeasTotal', (select count(*)::int from unanswered),
    'pastPlans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id,
        'title', x.title,
        'startsAt', x.starts_at,
        'meetingPlace', x.meeting_place,
        'ideaCategory', x.category
      ) order by x.starts_at desc)
        from (
          select * from proposed where is_past order by starts_at desc limit 3
        ) x
    ), '[]'::jsonb),
    'unread', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ideaId', u.idea_id,
        'ideaTitle', u.idea_title,
        'unreadCount', u.unread_count,
        'lastAt', u.last_at,
        'lastAuthor', nullif(btrim(u.last_author), '')
      ) order by u.last_at desc)
        from public.unread_conversations(p_actor) u
    ), '[]'::jsonb)
  )
    from mine;
$$;

create or replace function public.home_latest_memory(p_actor uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select private.home_memory_card(mem.id)
    from public.space_members me
    join public.spaces s on s.id = me.space_id and s.status = 'open'
    join public.memories mem on mem.space_id = me.space_id
   where me.user_id = p_actor
   order by mem.happened_on desc, mem.id desc
   limit 1;
$$;

create or replace function public.home_on_this_day(p_actor uuid, p_today date)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with raw as (
    select mem.id,
           mem.happened_on,
           years.years_ago,
           exists (
             select 1 from public.memory_photos ph
              where ph.memory_id = mem.id and ph.status = 'ready'
           ) as has_photo,
           (extract(year from mem.happened_on)::int + years.years_ago) as anniversary_year
      from public.space_members me
      join public.spaces s on s.id = me.space_id and s.status = 'open'
      join public.memories mem on mem.space_id = me.space_id
      cross join lateral generate_series(
        greatest(1, extract(year from p_today)::int - extract(year from mem.happened_on)::int - 1),
        extract(year from p_today)::int - extract(year from mem.happened_on)::int + 1
      ) years(years_ago)
     where me.user_id = p_actor
       and extract(year from mem.happened_on) < extract(year from p_today)
  ),
  candidates as (
    select raw.*,
           case
             when extract(month from raw.happened_on) = 2
              and extract(day from raw.happened_on) = 29
              and not (
                (raw.anniversary_year % 4 = 0 and raw.anniversary_year % 100 <> 0)
                or raw.anniversary_year % 400 = 0
              )
             then make_date(raw.anniversary_year, 2, 28)
             else make_date(
               raw.anniversary_year,
               extract(month from raw.happened_on)::int,
               extract(day from raw.happened_on)::int
             )
           end as anniversary
      from raw
  ),
  picked as (
    select c.*,
           abs(c.anniversary - p_today) as distance
      from candidates c
     where abs(c.anniversary - p_today) <= 3
     order by
       (c.anniversary = p_today) desc,
       c.years_ago asc,
       c.has_photo desc,
       abs(c.anniversary - p_today) asc,
       c.id
     limit 1
  )
  select jsonb_build_object(
    'memory', private.home_memory_card(p.id),
    'label', case
      when p.anniversary = p_today then
        'לפני ' || case p.years_ago when 1 then 'שנה' when 2 then 'שנתיים' else p.years_ago || ' שנים' end || ' בדיוק'
      else
        'השבוע לפני ' || case p.years_ago when 1 then 'שנה' when 2 then 'שנתיים' else p.years_ago || ' שנים' end
    end
  )
    from picked p;
$$;

revoke all on function private.home_memory_card(uuid) from public, anon, authenticated;
revoke all on function public.home_summary(uuid) from public, anon, authenticated;
revoke all on function public.home_latest_memory(uuid) from public, anon, authenticated;
revoke all on function public.home_on_this_day(uuid, date) from public, anon, authenticated;
grant execute on function public.home_summary(uuid) to service_role;
grant execute on function public.home_latest_memory(uuid) to service_role;
grant execute on function public.home_on_this_day(uuid, date) to service_role;
