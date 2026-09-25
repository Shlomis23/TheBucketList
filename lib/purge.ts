import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

// מחיקה סופית של מרחב סגור — נקרא מהמשימה היומית (app/api/cron/daily)
// כשתקופת החרטה נגמרה, או מיד במחיקת חשבון של חבר יחיד.
//
// סדר: קודם הקבצים ב-Storage (צריך את השורות כדי לדעת מה למחוק), אחר כך
// purge_space (0020) שמוחק את כל השורות ומחזיר את מי שביקש מחיקת חשבון,
// ואז מחיקתם מ-Auth (profiles נמחק ב-cascade). כל שלב בטוח לריצה חוזרת:
// אם משהו נכשל באמצע, הריצה של מחר ממשיכה מאותה נקודה.

const BUCKET = "memories-private";

async function removeObjects(paths: string[]) {
  const service = createSupabaseServiceClient();
  const bucket = service.storage.from(BUCKET);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await bucket.remove(paths.slice(i, i + 100));
    if (error) throw new Error("storage remove failed");
  }
}

// כל האובייקטים תחת <space_id>/ — גם כאלה שאין להם שורה (יתומים מהעלאה
// שנכשלה), כדי שלא יישאר כלום מהמרחב באחסון.
async function listSpaceObjects(spaceId: string): Promise<string[]> {
  const service = createSupabaseServiceClient();
  const bucket = service.storage.from(BUCKET);
  const paths: string[] = [];
  const { data: folders, error } = await bucket.list(spaceId, { limit: 1000 });
  if (error) throw new Error("storage list failed");
  for (const folder of folders ?? []) {
    // תיקייה (memory_id) מוחזרת בלי id; קובץ ישירות תחת המרחב — עם id.
    if (folder.id) {
      paths.push(`${spaceId}/${folder.name}`);
      continue;
    }
    for (let offset = 0; ; offset += 1000) {
      const { data: files, error: listError } = await bucket.list(`${spaceId}/${folder.name}`, { limit: 1000, offset });
      if (listError) throw new Error("storage list failed");
      for (const f of files ?? []) paths.push(`${spaceId}/${folder.name}/${f.name}`);
      if (!files || files.length < 1000) break;
    }
  }
  return paths;
}

export async function purgeSpaceNow(spaceId: string): Promise<boolean> {
  const service = createSupabaseServiceClient();
  try {
    await removeObjects(await listSpaceObjects(spaceId));

    const { data: usersToDelete, error } = await service.rpc("purge_space", { p_space_id: spaceId });
    if (error) throw new Error(`purge_space failed: ${error.message}`);

    for (const userId of (usersToDelete as string[] | null) ?? []) {
      const { error: authError } = await service.auth.admin.deleteUser(userId);
      if (authError) console.error("purge: auth delete failed", authError.status);
    }
    return true;
  } catch (e) {
    console.error("purge failed", spaceId, e instanceof Error ? e.message : "unknown");
    return false;
  }
}

// העלאות/מחיקות שנתקעו באמצע (יותר משעה) — השורות נמחקות ב-DB, הקבצים כאן.
export async function cleanupStalePhotos(): Promise<number> {
  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("cleanup_stale_photos");
  if (error) throw new Error("cleanup_stale_photos failed");
  const paths = ((data as string[] | null) ?? []).flatMap((p) => [p, `${p}.t`]);
  if (paths.length) await removeObjects(paths);
  return paths.length / 2;
}

export async function listSpacesDueForPurge(): Promise<string[]> {
  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("list_spaces_due_for_purge");
  if (error) throw new Error("list_spaces_due_for_purge failed");
  return (data as string[] | null) ?? [];
}

// קבצים יתומים (0027): אין להם שורה ב-memory_photos — העלאה שנכשלה באמצע,
// או נתונים שנמחקו ישירות ב-DB (Supabase לא מאפשר מחיקת קבצים ב-SQL).
export async function sweepOrphanObjects(): Promise<number> {
  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("list_orphan_storage_objects");
  if (error) throw new Error("list_orphan_storage_objects failed");
  const paths = (data as string[] | null) ?? [];
  if (paths.length) await removeObjects(paths);
  return paths.length;
}
