-- ==========================================================================
-- 0010_idea_archive_rpcs.sql
--
-- RPC שירות ל-archiveIdea/restoreIdea (spec סעיף 13.2, 7): רעיון עובר
-- ארכוב, ואינו נמחק פיזית (סעיף 6.1). ארכוב חסום כל עוד קיימת תוכנית
-- proposed לרעיון — כדי לא "לקבור" רעיון שיש עליו תכנון פעיל בלי שהמשתמש
-- יבטל/ישלים אותו קודם. p_actor מגיע מהשרת בלבד, כמו כל RPC שירות אחר.
-- ==========================================================================

create or replace function public.archive_idea(
  p_actor uuid, p_id uuid, p_expected_version integer
) returns public.ideas
language plpgsql security definer set search_path = ''
as $$
declare
  v_idea public.ideas%rowtype;
  v_has_active_plan boolean;
begin
  select i.* into v_idea
    from public.ideas i
    join public.space_members m on m.space_id = i.space_id
    join public.spaces s on s.id = i.space_id
    where i.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of i;
  if v_idea.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_idea.status <> 'active' then
    raise exception 'VERSION_CONFLICT';
  end if;
  if v_idea.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  select exists(
    select 1 from public.plans where idea_id = p_id and status = 'proposed'
  ) into v_has_active_plan;
  if v_has_active_plan then
    raise exception 'ACTIVE_PLAN_EXISTS';
  end if;

  update public.ideas set status = 'archived', version = version + 1, updated_at = now()
    where id = p_id
    returning * into v_idea;

  return v_idea;
end;
$$;
revoke all on function public.archive_idea(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.archive_idea(uuid,uuid,integer) to service_role;

create or replace function public.restore_idea(
  p_actor uuid, p_id uuid, p_expected_version integer
) returns public.ideas
language plpgsql security definer set search_path = ''
as $$
declare
  v_idea public.ideas%rowtype;
begin
  select i.* into v_idea
    from public.ideas i
    join public.space_members m on m.space_id = i.space_id
    join public.spaces s on s.id = i.space_id
    where i.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of i;
  if v_idea.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_idea.status <> 'archived' then
    raise exception 'VERSION_CONFLICT';
  end if;
  if v_idea.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  update public.ideas set status = 'active', version = version + 1, updated_at = now()
    where id = p_id
    returning * into v_idea;

  return v_idea;
end;
$$;
revoke all on function public.restore_idea(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.restore_idea(uuid,uuid,integer) to service_role;
