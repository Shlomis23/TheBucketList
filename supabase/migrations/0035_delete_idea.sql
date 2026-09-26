-- ==========================================================================
-- 0035_delete_idea.sql
--
-- מחיקת רעיון (26.9, החלטת שלומי — מעדכן את spec 6.1 "רק ארכוב"): לרעיון
-- שנוסף בטעות או ששניכם עניתם עליו "לא". כל אחד מבני הזוג יכול למחוק כל
-- רעיון במרחב (כמו תמונות — זה מרחב משותף). האישור וה"ביטול" בצד הלקוח.
--
-- חסום כשיש לרעיון תוכנית פעילה (proposed) או שהושלמה (completed — יש לה
-- זיכרון): זיכרונות לא נמחקים בגלל ניקיון של רעיונות. רעיון כזה — רק ארכיון.
-- תוכניות שבוטלו (cancelled) נמחקות יחד עם הרעיון (אין להן זיכרון, ובלי
-- זה ה-FK של plans->ideas חוסם). תגובות, שיחה, סימוני קריאה ומאצ' שנחגג —
-- on delete cascade מ-0001/0026/0030.
-- p_actor מהשרת בלבד (getVerifiedUserId), כמו כל RPC שירות.
-- ==========================================================================

create or replace function public.delete_idea(
  p_actor uuid, p_id uuid, p_expected_version integer
) returns boolean
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
  if v_idea.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  if exists (
    select 1 from public.plans
    where idea_id = p_id and status in ('proposed', 'completed')
  ) then
    raise exception 'HAS_PLAN';
  end if;

  delete from public.plans where idea_id = p_id and status = 'cancelled';
  delete from public.ideas where id = p_id;
  return true;
end;
$$;
revoke all on function public.delete_idea(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.delete_idea(uuid,uuid,integer) to service_role;
