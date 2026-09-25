-- 0030: רגע המאצ' (26.9, אפשרות ב). מסך חגיגה מלא — פעם אחת לכל אחד מכם:
--   - מי שהשלים את המאצ' רואה אותו מיד (setReactionAction מסמן "נראה").
--   - בן/בת הזוג רואים אותו בפתיחה/רענון הבאים של האפליקציה, בכל מסך.
-- private.match_seen = מי כבר ראה את החגיגה של איזה רעיון.

create table private.match_seen (
  user_id uuid not null references public.profiles(id) on delete cascade,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, idea_id)
);
alter table private.match_seen enable row level security;
create index match_seen_idea_id_idx on private.match_seen (idea_id);

-- מאצ'ים פעילים במרחב הפתוח של p_actor (אותו כלל כמו list_my_matches).
create or replace function private.open_space_matches(p_actor uuid)
returns table (idea_id uuid, title text, matched_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.title, max(r.updated_at)
    from public.space_members me
    join public.spaces s on s.id = me.space_id and s.status = 'open'
    join public.ideas i on i.space_id = me.space_id and i.status = 'active'
    join public.idea_reactions r on r.idea_id = i.id and r.preference = 'yes'
   where me.user_id = p_actor
     and (select count(*) from public.space_members m where m.space_id = me.space_id) = 2
   group by i.id, i.title
  having count(*) = 2;
$$;

-- לפריסה של האפליקציה: השמות (לראשי התיבות) ומאצ'ים שעוד לא נחגגו אצלי.
create or replace function public.match_celebration_state(p_actor uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'me', (select display_name from public.profiles where id = p_actor),
    'partner', (
      select p.display_name
        from public.space_members me
        join public.space_members m on m.space_id = me.space_id and m.user_id <> me.user_id
        join public.profiles p on p.id = m.user_id
       where me.user_id = p_actor
       limit 1
    ),
    'unseen', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.idea_id, 'title', x.title) order by x.matched_at desc)
        from private.open_space_matches(p_actor) x
       where not exists (select 1 from private.match_seen ms where ms.user_id = p_actor and ms.idea_id = x.idea_id)
    ), '[]'::jsonb)
  );
$$;

-- סימון "ראיתי". רק מאצ'ים אמיתיים במרחב הפתוח שלי. מחזיר [{id,title}]
-- של מה שסומן עכשיו (ריק = כבר נחגג קודם, או לא מאצ').
create or replace function public.mark_matches_seen(p_actor uuid, p_idea_ids uuid[])
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_out jsonb;
begin
  with ins as (
    insert into private.match_seen (user_id, idea_id)
    select p_actor, x.idea_id
      from private.open_space_matches(p_actor) x
     where x.idea_id = any(p_idea_ids)
    on conflict do nothing
    returning idea_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'title', i.title)), '[]'::jsonb)
    into v_out
    from ins join public.ideas i on i.id = ins.idea_id;
  return v_out;
end;
$$;

-- מאצ'ים שכבר קיימים לא יקפיצו חגיגה אחרי ההעלאה.
insert into private.match_seen (user_id, idea_id)
select m.user_id, x.idea_id
  from public.space_members m
  cross join lateral private.open_space_matches(m.user_id) x
on conflict do nothing;

revoke all on function private.open_space_matches(uuid) from public, anon, authenticated;
revoke all on function public.match_celebration_state(uuid) from public, anon, authenticated;
revoke all on function public.mark_matches_seen(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.match_celebration_state(uuid) to service_role;
grant execute on function public.mark_matches_seen(uuid, uuid[]) to service_role;
