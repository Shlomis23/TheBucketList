-- ==========================================================================
-- 0018_photo_rpcs.sql
--
-- תמונות לזיכרונות — spec סעיף 11.3 (זרימת העלאה/צפייה/מחיקה), 13.2
-- (createPhotoUpload/finalize/deletePhoto). שלומי אישר (25.9) "אופציה א":
-- Supabase Storage, עם הקטנה אוטומטית ועד 10 תמונות לזיכרון (במקום 20
-- שבאפיון — כדי לשמור על ה-1GB של התוכנית החינמית).
--
-- הטבלה memory_photos, ה-bucket הפרטי memories-private ומדיניות הקריאה כבר
-- קיימים (0001/0002/0004). כאן רק פונקציות כתיבה, service_role בלבד, p_actor
-- מהשרת. סדר הפעולות (האובייקט ב-Storage נכתב/נמחק מחוץ לטרנזקציה):
--   העלאה:  create_photo_upload (pending) -> [שרת: עיבוד + כתיבה ל-Storage]
--           -> finalize_photo (ready)   | כשל -> abort_photo_upload
--   מחיקה:  begin_delete_photo (deleting — נעלם מיד מהצפייה)
--           -> [שרת: מחיקה מ-Storage] -> finish_delete_photo (מחיקת השורה)
-- photos_ready_read (0002) חושף ללקוח רק status='ready', כך ש-pending/
-- deleting לעולם לא מוצגים.
-- ==========================================================================

-- quota: עד 10 לזיכרון, כולל pending "חי" (פחות משעה). pending ישן יותר הוא
-- העלאה שנכשלה באמצע — נמחק כאן כדי שלא יחסום לנצח (spec: "מוחק pending
-- ישנים לאחר שעה"). אובייקט יתום ב-Storage מהעלאה כזו (אם נכתב) נשאר
-- לתהליך ניקוי עתידי — הוא לא נגיש לאף אחד בלי שורה ב-ready.
create or replace function public.create_photo_upload(
  p_actor uuid,
  p_request_id uuid,
  p_memory_id uuid,
  p_declared_mime text,
  p_declared_size bigint
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_memory public.memories%rowtype;
  v_photo_id uuid;
  v_count int;
  v_existing_resource uuid;
  v_existing_hash text;
  v_payload_hash text := md5(coalesce(p_memory_id::text, ''));
begin
  if p_declared_mime not in ('image/jpeg', 'image/png', 'image/webp')
     or p_declared_size is null or p_declared_size < 1 or p_declared_size > 10485760 then
    raise exception 'INVALID_INPUT';
  end if;

  select mem.* into v_memory
    from public.memories mem
    join public.space_members m on m.space_id = mem.space_id
    join public.spaces s on s.id = mem.space_id
    where mem.id = p_memory_id and m.user_id = p_actor and s.status = 'open'
    for update of mem;
  if v_memory.id is null then
    raise exception 'NOT_FOUND';
  end if;

  select resource_id, payload_hash into v_existing_resource, v_existing_hash
    from private.mutation_keys
    where actor_id = p_actor and operation = 'create_photo_upload' and request_id = p_request_id;
  if found then
    if v_existing_hash = v_payload_hash and v_existing_resource is not null then
      return v_existing_resource;
    end if;
    raise exception 'VERSION_CONFLICT';
  end if;

  delete from public.memory_photos
    where memory_id = p_memory_id and status = 'pending' and created_at < now() - interval '1 hour';

  select count(*) into v_count
    from public.memory_photos
    where memory_id = p_memory_id and status in ('pending', 'ready');
  if v_count >= 10 then
    raise exception 'QUOTA_EXCEEDED';
  end if;

  v_photo_id := gen_random_uuid();
  insert into public.memory_photos (id, space_id, memory_id, uploaded_by, object_path, mime_type, byte_size, status)
    values (
      v_photo_id, v_memory.space_id, v_memory.id, p_actor,
      v_memory.space_id::text || '/' || v_memory.id::text || '/' || v_photo_id::text,
      p_declared_mime, p_declared_size, 'pending'
    );

  insert into private.mutation_keys (actor_id, operation, request_id, payload_hash, resource_id)
    values (p_actor, 'create_photo_upload', p_request_id, v_payload_hash, v_photo_id);

  return v_photo_id;
end;
$$;

-- מאמת שוב (spec 11.3 שלב 5): מרחב עדיין פתוח, התמונה של המעלה, עדיין
-- pending. mime/size הם של הקובץ שעובד בשרת בפועל — לא מה שהלקוח הצהיר.
create or replace function public.finalize_photo(
  p_actor uuid,
  p_photo_id uuid,
  p_mime text,
  p_size bigint
) returns public.memory_photos
language plpgsql security definer set search_path = ''
as $$
declare
  v_photo public.memory_photos%rowtype;
  v_next int;
begin
  if p_mime not in ('image/jpeg', 'image/png', 'image/webp')
     or p_size is null or p_size < 1 or p_size > 10485760 then
    raise exception 'INVALID_INPUT';
  end if;

  select p.* into v_photo
    from public.memory_photos p
    join public.space_members m on m.space_id = p.space_id
    join public.spaces s on s.id = p.space_id
    where p.id = p_photo_id and m.user_id = p_actor and s.status = 'open'
    for update of p;
  if v_photo.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_photo.uploaded_by <> p_actor or v_photo.status <> 'pending' then
    raise exception 'VERSION_CONFLICT';
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_next
    from public.memory_photos where memory_id = v_photo.memory_id and status = 'ready';

  update public.memory_photos
    set status = 'ready', mime_type = p_mime, byte_size = p_size, sort_order = v_next
    where id = p_photo_id
    returning * into v_photo;
  return v_photo;
end;
$$;

-- העלאה שנכשלה בעיבוד (קובץ פסול/גדול/HEIC) — מוחקים את ה-pending מיד כדי
-- שלא יתפוס מקום במכסה עד הניקוי של שעה.
create or replace function public.abort_photo_upload(
  p_actor uuid,
  p_photo_id uuid
) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.memory_photos
    where id = p_photo_id and uploaded_by = p_actor and status = 'pending';
  return found;
end;
$$;

-- spec: "מחיקת תמונה על ידי המעלה". deleting חוסם צפייה חדשה מיד; מחזיר את
-- הנתיב כדי שהשרת ימחק את האובייקט. קריאה חוזרת על deleting (retry אחרי
-- כשל Storage) מחזירה שוב את הנתיב.
create or replace function public.begin_delete_photo(
  p_actor uuid,
  p_photo_id uuid
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_photo public.memory_photos%rowtype;
begin
  select p.* into v_photo
    from public.memory_photos p
    join public.space_members m on m.space_id = p.space_id
    where p.id = p_photo_id and m.user_id = p_actor
    for update of p;
  if v_photo.id is null or v_photo.status not in ('ready', 'deleting') then
    raise exception 'NOT_FOUND';
  end if;
  if v_photo.uploaded_by <> p_actor then
    raise exception 'NOT_AUTHOR';
  end if;

  update public.memory_photos set status = 'deleting' where id = p_photo_id;
  return v_photo.object_path;
end;
$$;

create or replace function public.finish_delete_photo(
  p_actor uuid,
  p_photo_id uuid
) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.memory_photos
    where id = p_photo_id and uploaded_by = p_actor and status = 'deleting';
  return found;
end;
$$;

revoke all on function public.create_photo_upload(uuid,uuid,uuid,text,bigint) from public, anon, authenticated;
revoke all on function public.finalize_photo(uuid,uuid,text,bigint) from public, anon, authenticated;
revoke all on function public.abort_photo_upload(uuid,uuid) from public, anon, authenticated;
revoke all on function public.begin_delete_photo(uuid,uuid) from public, anon, authenticated;
revoke all on function public.finish_delete_photo(uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_photo_upload(uuid,uuid,uuid,text,bigint) to service_role;
grant execute on function public.finalize_photo(uuid,uuid,text,bigint) to service_role;
grant execute on function public.abort_photo_upload(uuid,uuid) to service_role;
grant execute on function public.begin_delete_photo(uuid,uuid) to service_role;
grant execute on function public.finish_delete_photo(uuid,uuid) to service_role;
