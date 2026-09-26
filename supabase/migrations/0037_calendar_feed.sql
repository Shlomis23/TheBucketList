-- ==========================================================================
-- 0037_calendar_feed.sql
--
-- יומן במינוי (26.9, החלטת שלומי): קובץ .ics בודד לא נפתח מהאפליקציה
-- המותקנת באייפון (חלון דפדפן מצומצם — מגבלה של אפל). במקום זה: לכל משתמש
-- קישור יומן אישי וסודי (webcal://), שנרשמים אליו פעם אחת — וכל התוכניות של
-- המרחב נכנסות ומתעדכנות לבד (שינוי מועד, ביטול).
--
-- הטוקן: 32 בתים אקראיים (hex), private בלבד, אפשר לאפס (הישן מפסיק לעבוד).
-- calendar_feed_plans: לפי טוקן — רק מרחב פתוח שהמשתמש חבר בו; תוכניות
-- מתוכננות עם מועד, ומה שהושלם ב-90 הימים האחרונים. בוטלו — לא (נעלמות
-- מהיומן ברענון הבא). service_role בלבד (הנתיב /api/calendar/<token>.ics).
-- ==========================================================================

create table private.calendar_feeds (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  token text not null unique check (char_length(token) = 64),
  created_at timestamptz not null default now()
);
alter table private.calendar_feeds enable row level security;

create or replace function public.calendar_feed_token(p_actor uuid, p_rotate boolean default false)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_token text;
begin
  if p_actor is null or not exists (select 1 from public.profiles where id = p_actor) then
    raise exception 'NOT_FOUND';
  end if;
  if not p_rotate then
    select token into v_token from private.calendar_feeds where user_id = p_actor;
    if v_token is not null then
      return v_token;
    end if;
  end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into private.calendar_feeds (user_id, token) values (p_actor, v_token)
    on conflict (user_id) do update set token = excluded.token, created_at = now();
  return v_token;
end;
$$;

create or replace function public.calendar_feed_plans(p_token text)
returns table (
  id uuid, title text, status text, starts_at timestamptz, ends_at timestamptz,
  meeting_place text, notes text, updated_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  -- טוקן לא קיים (או אופס) -> שגיאה, והנתיב מחזיר 404: היומן שנרשם אליו
  -- מפסיק להתעדכן במקום לקבל "יומן ריק" בשקט.
  if char_length(coalesce(p_token, '')) <> 64
     or not exists (select 1 from private.calendar_feeds f where f.token = p_token) then
    raise exception 'NOT_FOUND';
  end if;
  return query
  select p.id, p.title, p.status, p.starts_at, p.ends_at, p.meeting_place, p.notes, p.updated_at
    from private.calendar_feeds f
    join public.space_members m on m.user_id = f.user_id
    join public.spaces s on s.id = m.space_id and s.status = 'open'
    join public.plans p on p.space_id = m.space_id
   where f.token = p_token
     and p.starts_at is not null
     and (p.status = 'proposed' or (p.status = 'completed' and p.starts_at > now() - interval '90 days'))
   order by p.starts_at;
end;
$$;

revoke all on function public.calendar_feed_token(uuid, boolean) from public, anon, authenticated;
revoke all on function public.calendar_feed_plans(text) from public, anon, authenticated;
grant execute on function public.calendar_feed_token(uuid, boolean) to service_role;
grant execute on function public.calendar_feed_plans(text) to service_role;
