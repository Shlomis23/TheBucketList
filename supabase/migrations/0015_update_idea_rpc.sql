-- ==========================================================================
-- 0015_update_idea_rpc.sql
--
-- עריכת רעיון קיים — שלומי אישר במפורש (24.9) לבנות עכשיו. RPC שירות
-- (service_role בלבד, p_actor מהשרת) בדפוס concurrency הקיים
-- (expectedVersion, ראו archive_idea/restore_idea ב-0010, create_space
-- ב-0006/0013): נועל את השורה (for update of i), בודק חברות במרחב וגרסה
-- תואמת, ורק אז מעדכן ומקדם version. בלי idempotency key (בשונה מ-create_idea) —
-- זו עדכון-במקום עם expectedVersion, לא יצירה חדשה, אז אין סיכון כפילות
-- מ-retry: ניסיון שני עם אותה גרסה שכבר עודכנה נכשל ב-VERSION_CONFLICT.
-- ==========================================================================

create or replace function public.update_idea(
  p_actor uuid,
  p_id uuid,
  p_expected_version integer,
  p_title text,
  p_description text,
  p_category text,
  p_location_text text,
  p_source_url text,
  p_cost_minor bigint,
  p_duration_minutes integer
) returns public.ideas
language plpgsql security definer set search_path = ''
as $$
declare
  v_idea public.ideas%rowtype;
  v_title text := btrim(p_title);
begin
  if v_title is null or char_length(v_title) < 1 or char_length(v_title) > 120 then
    raise exception 'INVALID_INPUT';
  end if;

  select i.* into v_idea
    from public.ideas i
    join public.space_members m on m.space_id = i.space_id
    join public.spaces s on s.id = i.space_id
    where i.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of i;
  if v_idea.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_idea.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  update public.ideas set
    title = v_title,
    description = coalesce(p_description, ''),
    category = coalesce(p_category, 'other'),
    location_text = nullif(btrim(coalesce(p_location_text, '')), ''),
    source_url = nullif(btrim(coalesce(p_source_url, '')), ''),
    cost_minor = p_cost_minor,
    duration_minutes = p_duration_minutes,
    version = version + 1,
    updated_at = now()
  where id = p_id
  returning * into v_idea;

  return v_idea;
end;
$$;
revoke all on function public.update_idea(uuid,uuid,integer,text,text,text,text,text,bigint,integer)
  from public, anon, authenticated;
grant execute on function public.update_idea(uuid,uuid,integer,text,text,text,text,text,bigint,integer)
  to service_role;
