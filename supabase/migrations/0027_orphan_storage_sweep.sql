-- ==========================================================================
-- 0027_orphan_storage_sweep.sql
--
-- קבצים יתומים ב-Storage: אובייקט ב-memories-private שאין לו שורה ב-
-- memory_photos (העלאה שנכשלה באמצע, או מחיקת נתונים ישירה ב-DB — Supabase
-- לא מאפשר למחוק קבצים ב-SQL, רק דרך ה-Storage API). המשימה היומית מוחקת
-- אותם דרך ה-API. רק קבצים בני יותר משעה — לא נוגעים בהעלאה שבאמצע.
-- ==========================================================================
create or replace function public.list_orphan_storage_objects()
returns setof text
language sql stable security definer set search_path = ''
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'memories-private'
     and o.created_at < now() - interval '1 hour'
     and not exists (
       select 1 from public.memory_photos p
        where p.object_path = o.name or p.object_path || '.t' = o.name
     )
   limit 500;
$$;

revoke all on function public.list_orphan_storage_objects() from public, anon, authenticated;
grant execute on function public.list_orphan_storage_objects() to service_role;
