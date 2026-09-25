-- 0029
-- 1. מחיקת תמונות: שני בני הזוג (החלטת שלומי, 26.9: "זה זיכרון משותף").
--    במקום "רק מי שהעלה" — כל חבר במרחב, ורק כשהמרחב פתוח (במרחב סגור
--    אפשר רק להוריד ZIP). finish_delete_photo משלים גם אם בן/בת הזוג התחילו.
-- 2. אינדקסים לכל ה-FK שחסר להם (Supabase advisor 0001) — מחיקת מרחב
--    ובדיקות FK לא סורקות טבלה שלמה.

create or replace function public.begin_delete_photo(p_actor uuid, p_photo_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_photo public.memory_photos%rowtype;
begin
  select p.* into v_photo
    from public.memory_photos p
    join public.space_members m on m.space_id = p.space_id
    join public.spaces s on s.id = p.space_id
    where p.id = p_photo_id and m.user_id = p_actor and s.status = 'open'
    for update of p;
  if v_photo.id is null or v_photo.status not in ('ready', 'deleting') then
    raise exception 'NOT_FOUND';
  end if;

  update public.memory_photos set status = 'deleting' where id = p_photo_id;
  return v_photo.object_path;
end;
$$;

create or replace function public.finish_delete_photo(p_actor uuid, p_photo_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.memory_photos p
   using public.space_members m
   where p.id = p_photo_id and p.status = 'deleting'
     and m.space_id = p.space_id and m.user_id = p_actor;
  return found;
end;
$$;

create index if not exists idea_comments_idea_id_space_id_fkey_idx on public.idea_comments (idea_id, space_id);
create index if not exists idea_comments_space_id_created_by_fkey_idx on public.idea_comments (space_id, created_by);
create index if not exists idea_reactions_idea_id_space_id_fkey_idx on public.idea_reactions (idea_id, space_id);
create index if not exists ideas_space_id_created_by_fkey_idx on public.ideas (space_id, created_by);
create index if not exists memories_plan_id_space_id_fkey_idx on public.memories (plan_id, space_id);
create index if not exists memories_space_id_created_by_fkey_idx on public.memories (space_id, created_by);
create index if not exists memory_photos_memory_id_space_id_fkey_idx on public.memory_photos (memory_id, space_id);
create index if not exists memory_photos_space_id_uploaded_by_fkey_idx on public.memory_photos (space_id, uploaded_by);
create index if not exists plans_idea_id_space_id_fkey_idx on public.plans (idea_id, space_id);
create index if not exists plans_space_id_created_by_fkey_idx on public.plans (space_id, created_by);
create index if not exists spaces_closed_by_fkey_idx on public.spaces (closed_by);
create index if not exists audit_events_actor_id_fkey_idx on private.audit_events (actor_id);
create index if not exists audit_events_space_id_fkey_idx on private.audit_events (space_id);
create index if not exists idea_reads_idea_id_fkey_idx on private.idea_reads (idea_id);
create index if not exists invitations_accepted_by_fkey_idx on private.invitations (accepted_by);
create index if not exists invitations_created_by_fkey_idx on private.invitations (created_by);
