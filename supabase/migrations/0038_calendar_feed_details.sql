-- ==========================================================================
-- 0038_calendar_feed_details.sql
--
-- אירוע ביומן שעומד בפני עצמו (26.9): באייפון קישור מהיומן לא פותח את
-- האפליקציה המותקנת (מגבלה של אפל), אז כל מה שצריך ברגע האמת נכנס לאירוע
-- עצמו — מקום (גם מהרעיון), ניווט, תקציב וקישור מהרעיון. אותה הרשאה ואותו
-- סינון כמו 0037; רק עמודות נוספות (שינוי סוג החזרה -> drop + create).
-- ==========================================================================

drop function if exists public.calendar_feed_plans(text);

create function public.calendar_feed_plans(p_token text)
returns table (
  id uuid, title text, status text, starts_at timestamptz, ends_at timestamptz,
  meeting_place text, notes text, updated_at timestamptz, budget_minor bigint,
  idea_location_text text, idea_place_id text, idea_source_url text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if char_length(coalesce(p_token, '')) <> 64
     or not exists (select 1 from private.calendar_feeds f where f.token = p_token) then
    raise exception 'NOT_FOUND';
  end if;
  return query
  select p.id, p.title, p.status, p.starts_at, p.ends_at, p.meeting_place, p.notes, p.updated_at, p.budget_minor,
         i.location_text, i.place_id, i.source_url
    from private.calendar_feeds f
    join public.space_members m on m.user_id = f.user_id
    join public.spaces s on s.id = m.space_id and s.status = 'open'
    join public.plans p on p.space_id = m.space_id
    join public.ideas i on i.id = p.idea_id
   where f.token = p_token
     and p.starts_at is not null
     and (p.status = 'proposed' or (p.status = 'completed' and p.starts_at > now() - interval '90 days'))
   order by p.starts_at;
end;
$$;

revoke all on function public.calendar_feed_plans(text) from public, anon, authenticated;
grant execute on function public.calendar_feed_plans(text) to service_role;
