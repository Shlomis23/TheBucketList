-- ==========================================================================
-- 0016_update_memory_rpc.sql
--
-- עריכת זיכרון (תאריך + סיפור) — spec סעיף 13.2 (updateMemory): "חבר;
-- version check; לא משנה plan/space/creator". שלומי אישר (25.9) את
-- ההחלטה הפתוחה בסעיף 16 #3: סיפור אחד משותף ששני בני הזוג יכולים לערוך.
--
-- אותו דפוס כמו update_idea (0015): RPC שירות (service_role בלבד, p_actor
-- מהשרת), נעילת השורה, בדיקת חברות + מרחב פתוח + גרסה תואמת, ורק אז עדכון
-- וקידום version. בלי idempotency key — עדכון-במקום עם expectedVersion, כך
-- ש-retry של אותה שמירה נכשל ב-VERSION_CONFLICT במקום לדרוס.
-- תאריך עתידי נדחה: זיכרון מתעד משהו שכבר קרה.
-- ==========================================================================

create or replace function public.update_memory(
  p_actor uuid,
  p_id uuid,
  p_expected_version integer,
  p_happened_on date,
  p_story text
) returns public.memories
language plpgsql security definer set search_path = ''
as $$
declare
  v_memory public.memories%rowtype;
  v_story text := coalesce(p_story, '');
begin
  if p_happened_on is null or char_length(v_story) > 5000 then
    raise exception 'INVALID_INPUT';
  end if;

  select mem.* into v_memory
    from public.memories mem
    join public.space_members m on m.space_id = mem.space_id
    join public.spaces s on s.id = mem.space_id
    where mem.id = p_id and m.user_id = p_actor and s.status = 'open'
    for update of mem;
  if v_memory.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_memory.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  -- "עתידי" לפי אזור הזמן של המרחב, לא לפי UTC של השרת: ב-00:30 בלילה
  -- בישראל (UTC+3) התאריך ב-UTC עדיין של אתמול, ובחירת "היום" הייתה
  -- נדחית בטעות כתאריך עתידי.
  if p_happened_on > (now() at time zone (
       select sp.timezone from public.spaces sp where sp.id = v_memory.space_id
     ))::date then
    raise exception 'INVALID_INPUT';
  end if;

  update public.memories set
    happened_on = p_happened_on,
    story = v_story,
    version = version + 1,
    updated_at = now()
  where id = p_id
  returning * into v_memory;

  return v_memory;
end;
$$;
revoke all on function public.update_memory(uuid,uuid,integer,date,text)
  from public, anon, authenticated;
grant execute on function public.update_memory(uuid,uuid,integer,date,text)
  to service_role;
