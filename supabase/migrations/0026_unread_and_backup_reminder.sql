-- ==========================================================================
-- 0026_unread_and_backup_reminder.sql (שלומי, 25.9)
--
-- 1. "לא נקרא" בשיחות: private.idea_reads — מתי כל אחד פתח לאחרונה כל רעיון.
--    הודעה של בן/בת הזוג שנכתבה אחרי זה = חדשה. כניסה לדף הרעיון מסמנת נקרא.
--    הודעות שקיימות כבר עכשיו נחשבות נקראו (backfill), כדי שלא יופיע
--    פתאום "30 הודעות חדשות".
-- 2. תזכורת גיבוי חודשית: רשימת מרחבים פתוחים עם לפחות זיכרון אחד + המכשירים
--    של שני החברים. השליחה (פעם בחודש, ב-1 בחודש) — במשימה היומית.
-- ==========================================================================

create table private.idea_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, idea_id)
);
alter table private.idea_reads enable row level security;

insert into private.idea_reads (user_id, idea_id, read_at)
select m.user_id, i.id, now()
  from public.ideas i join public.space_members m on m.space_id = i.space_id
on conflict do nothing;

create or replace function public.mark_idea_read(p_actor uuid, p_idea_id uuid)
returns void
language sql security definer set search_path = ''
as $$
  insert into private.idea_reads (user_id, idea_id, read_at)
  select p_actor, i.id, now()
    from public.ideas i
    join public.space_members m on m.space_id = i.space_id and m.user_id = p_actor
    join public.spaces s on s.id = i.space_id and s.status = 'open'
   where i.id = p_idea_id
  on conflict (user_id, idea_id) do update set read_at = excluded.read_at;
$$;

-- רעיונות שיש בהם הודעות מבן/בת הזוג שעוד לא ראיתי. החדש ביותר קודם.
create or replace function public.unread_conversations(p_actor uuid)
returns table (idea_id uuid, idea_title text, unread_count int, last_at timestamptz, last_author text)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.title, count(*)::int, max(c.created_at),
         (select p.display_name from public.idea_comments c2 join public.profiles p on p.id = c2.created_by
           where c2.idea_id = i.id and c2.created_by <> p_actor order by c2.created_at desc limit 1)
    from public.space_members m
    join public.spaces s on s.id = m.space_id and s.status = 'open'
    join public.ideas i on i.space_id = m.space_id
    join public.idea_comments c on c.idea_id = i.id and c.created_by <> p_actor
    left join private.idea_reads r on r.user_id = p_actor and r.idea_id = i.id
   where m.user_id = p_actor
     and c.created_at > coalesce(r.read_at, '-infinity'::timestamptz)
   group by i.id, i.title
   order by max(c.created_at) desc;
$$;

create or replace function public.backup_reminder_targets()
returns table (space_id uuid, memories int, targets jsonb)
language sql stable security definer set search_path = ''
as $$
  select s.id,
         (select count(*)::int from public.memories mem where mem.space_id = s.id),
         (select coalesce(jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)), '[]'::jsonb)
            from public.space_members m join private.push_subscriptions ps on ps.user_id = m.user_id
           where m.space_id = s.id)
    from public.spaces s
   where s.status = 'open'
     and exists (select 1 from public.memories mem where mem.space_id = s.id);
$$;

revoke all on function public.mark_idea_read(uuid, uuid) from public, anon, authenticated;
revoke all on function public.unread_conversations(uuid) from public, anon, authenticated;
revoke all on function public.backup_reminder_targets() from public, anon, authenticated;
grant execute on function public.mark_idea_read(uuid, uuid) to service_role;
grant execute on function public.unread_conversations(uuid) to service_role;
grant execute on function public.backup_reminder_targets() to service_role;
