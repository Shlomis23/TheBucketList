-- 0031: התראת "לפני שנה בדיוק" (26.9). נקרא מהמשימה היומית (09:07 שעון
-- ישראל) עם התאריך של היום בישראל: זיכרונות משנים קודמות מאותו יום ואותו
-- חודש, במרחבים פתוחים, עם המנויים של שני בני הזוג. 29.2 נחגג ב-28.2 בשנה
-- לא מעוברת. הבחירה (זיכרון אחד למרחב) והשליחה — lib/reminders.ts.
create or replace function public.on_this_day_targets(p_today date)
returns table (space_id uuid, memory_id uuid, title text, years_ago int, has_photo boolean, targets jsonb)
language sql stable security definer set search_path = ''
as $$
  select mem.space_id,
         mem.id,
         pl.title,
         (extract(year from p_today) - extract(year from mem.happened_on))::int,
         exists (select 1 from public.memory_photos ph where ph.memory_id = mem.id and ph.status = 'ready'),
         (select coalesce(jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)), '[]'::jsonb)
            from public.space_members m join private.push_subscriptions ps on ps.user_id = m.user_id
           where m.space_id = mem.space_id)
    from public.memories mem
    join public.spaces s on s.id = mem.space_id and s.status = 'open'
    join public.plans pl on pl.id = mem.plan_id
   where mem.happened_on < p_today
     and extract(year from mem.happened_on) < extract(year from p_today)
     and (
       to_char(mem.happened_on, 'MM-DD') = to_char(p_today, 'MM-DD')
       or (to_char(p_today, 'MM-DD') = '02-28'
           and to_char(mem.happened_on, 'MM-DD') = '02-29'
           and extract(day from (date_trunc('year', p_today) + interval '1 month 28 days')) <> 29)
     );
$$;

revoke all on function public.on_this_day_targets(date) from public, anon, authenticated;
grant execute on function public.on_this_day_targets(date) to service_role;
