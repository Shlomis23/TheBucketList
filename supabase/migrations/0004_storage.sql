-- ==========================================================================
-- 0004_storage.sql
--
-- מקור: docs/The-Bucket-List-Technical-Spec-HE.md סעיף 11.3.
-- bucket פרטי לתמונות זיכרון. לפני production: לוודא שה-bucket אכן נשאר
-- פרטי (ON CONFLICT DO NOTHING לא מתקן bucket שכבר פורסם כציבורי), ולבדוק
-- שאין policies permissive קודמות על storage.objects שמצטרפות ב-OR
-- ופותחות גישה בלי כוונה.
-- ==========================================================================

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('memories-private','memories-private',false,10485760,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- הגנה נוספת גם אם בהמשך תתאפשר קריאה ישירה עם JWT.
create policy memory_object_read on storage.objects
for select to authenticated using (
  bucket_id = 'memories-private' and exists (
    select 1 from public.memory_photos p
    where p.object_path = storage.objects.name and p.status = 'ready'
      and private.is_member(p.space_id)
  )
);

-- גישה ל-Storage נשלטת ע"י מדיניות על storage.objects; מפתחות שירות יכולים
-- לעקוף אותה ולכן נשארים בשרת בלבד
-- (https://supabase.com/docs/guides/storage/security/access-control).
