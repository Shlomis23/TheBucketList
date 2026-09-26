-- ==========================================================================
-- 0036_review_nudge.sql
--
-- תזכורת שבועית לסבב ההחלטות (26.9): למי שיש לו לפחות p_min רעיונות פעילים
-- שעוד לא הגיב עליהם — "3 רעיונות מחכים לך, סבב של חצי דקה". נקרא מהמשימה
-- היומית (lib/reminders.ts), שם נבחר היום בשבוע ונשמר "פעם בשבוע" (claim_push).
-- לכל משתמש בנפרד (כל אחד והרעיונות שמחכים לו), רק עם מנוי להתראות, רק
-- במרחב פתוח. service_role בלבד.
-- ==========================================================================

create or replace function public.review_nudge_targets(p_min integer default 2)
returns table (user_id uuid, pending int, sample_title text, targets jsonb)
language sql stable security definer set search_path = ''
as $$
  select m.user_id,
         count(i.id)::int,
         (array_agg(i.title order by i.created_at desc))[1],
         (select coalesce(jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)), '[]'::jsonb)
            from private.push_subscriptions ps where ps.user_id = m.user_id)
    from public.space_members m
    join public.spaces s on s.id = m.space_id and s.status = 'open'
    join public.ideas i on i.space_id = m.space_id and i.status = 'active'
   where not exists (
           select 1 from public.idea_reactions r where r.idea_id = i.id and r.user_id = m.user_id
         )
     and exists (select 1 from private.push_subscriptions ps where ps.user_id = m.user_id)
   group by m.user_id
  having count(i.id) >= greatest(p_min, 1);
$$;

revoke all on function public.review_nudge_targets(integer) from public, anon, authenticated;
grant execute on function public.review_nudge_targets(integer) to service_role;
