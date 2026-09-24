-- ==========================================================================
-- 0008_fix_set_reaction_ambiguity.sql
--
-- תיקון באג אמיתי: RETURNS TABLE (preference text, is_match boolean) הופך
-- את "preference" למשתנה PL/pgSQL בתוך גוף הפונקציה, שמתנגש עם העמודה
-- idea_reactions.preference בתת-השאילתה -> "column reference is ambiguous"
-- (42702) בכל קריאה אמיתית ל-set_reaction. תוקן ע"י aliasing מפורש לטבלה.
-- אומת ידנית מול production לפני התיקון (הבאג שוחזר), ואחריו (עובר).
-- ==========================================================================

create or replace function public.set_reaction(
  p_actor uuid, p_idea_id uuid, p_preference text
) returns table (preference text, is_match boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
begin
  if p_preference is not null and p_preference not in ('yes','maybe','no') then
    raise exception 'INVALID_INPUT';
  end if;

  select i.space_id into v_space
    from public.ideas i
    join public.space_members m on m.space_id = i.space_id
    join public.spaces s on s.id = i.space_id
    where i.id = p_idea_id and m.user_id = p_actor and s.status = 'open' and i.status = 'active';
  if v_space is null then
    raise exception 'NOT_FOUND';
  end if;

  if p_preference is null then
    delete from public.idea_reactions where idea_id = p_idea_id and user_id = p_actor;
  else
    insert into public.idea_reactions (space_id, idea_id, user_id, preference)
      values (v_space, p_idea_id, p_actor, p_preference)
      on conflict (idea_id, user_id)
      do update set preference = excluded.preference, updated_at = now();
  end if;

  return query
    select p_preference,
      (select count(*) from public.space_members sm where sm.space_id = v_space) = 2
      and (select count(*) from public.idea_reactions ir
           where ir.idea_id = p_idea_id and ir.preference = 'yes') = 2;
end;
$$;
revoke all on function public.set_reaction(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.set_reaction(uuid,uuid,text) to service_role;
