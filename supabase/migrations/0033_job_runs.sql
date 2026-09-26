-- 0033: דוח בריאות למשימה היומית (26.9). ב-Vercel בתוכנית החינמית לוגים
-- ישנים לא נגישים, אז כל ריצה נשמרת כאן (90 אחרונות), והשרת שולח התראה
-- למי שפתח את המרחב (slot 1) כשמשהו נכשל או כשהיה פער של יותר מ-36 שעות.
create table private.job_runs (
  id bigserial primary key,
  job text not null,
  ran_at timestamptz not null default now(),
  ok boolean not null,
  summary jsonb not null default '{}'::jsonb
);
alter table private.job_runs enable row level security;
create index job_runs_job_ran_at_idx on private.job_runs (job, ran_at desc);

-- שומר ריצה ומחזיר מתי הייתה הקודמת (לזיהוי יום שדילגנו עליו).
create or replace function public.record_job_run(p_job text, p_ok boolean, p_summary jsonb)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_prev timestamptz;
begin
  select max(ran_at) into v_prev from private.job_runs where job = p_job;
  insert into private.job_runs (job, ok, summary) values (p_job, p_ok, coalesce(p_summary, '{}'::jsonb));
  delete from private.job_runs
   where job = p_job
     and id not in (select id from private.job_runs where job = p_job order by ran_at desc limit 90);
  return v_prev;
end;
$$;

-- למי שולחים התראת תקלה: המנויים של מי שפתח כל מרחב פתוח.
create or replace function public.ops_alert_targets()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)), '[]'::jsonb)
    from public.space_members m
    join public.spaces s on s.id = m.space_id and s.status = 'open'
    join private.push_subscriptions ps on ps.user_id = m.user_id
   where m.slot = 1;
$$;

revoke all on function public.record_job_run(text, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.ops_alert_targets() from public, anon, authenticated;
grant execute on function public.record_job_run(text, boolean, jsonb) to service_role;
grant execute on function public.ops_alert_targets() to service_role;
