import "server-only";

import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";
import { processPhoto, thumbPath } from "@/lib/photos/process";

// תמונות זיכרון — spec 11.3/13.2/13.3, "אופציה א" (Supabase Storage, 25.9).
//
// קריאה: שורות memory_photos דרך client המשתמש -> RLS photos_ready_read
// מחזיר רק ready של המרחב שלי. הקובץ עצמו נקרא רק אחרי שהשורה עברה RLS,
// עם service client (ה-bucket פרטי; אין URL ציבורי או חתום בשום מצב).
// כתיבה: רק דרך ה-RPC של 0018 (service_role, p_actor מה-session).

const BUCKET = "memories-private";
export const PHOTOS_PER_MEMORY = 10;

export type PhotoDto = { id: string; isMine: boolean };

export async function listPhotos(memoryId: string): Promise<PhotoDto[]> {
  const [supabase, userId] = await Promise.all([createSupabaseServerClient(), getVerifiedUserId()]);
  const { data } = await supabase
    .from("memory_photos")
    .select("id, uploaded_by")
    .eq("memory_id", memoryId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<{ id: string; uploaded_by: string }[]>();
  return (data ?? []).map((p) => ({ id: p.id, isMine: p.uploaded_by === userId }));
}

function rpcMessage(error: { message?: string } | null) {
  return error?.message ?? "";
}

// העלאה: עיבוד (לפני שנוגעים ב-DB — קובץ פסול לא משאיר כלום) -> pending
// -> שני אובייקטים ל-Storage -> ready. כל כשל אחרי ה-pending מבטל אותו
// ומנקה את מה שכבר נכתב, כדי שלא יתפוס מקום במכסה.
export async function uploadPhoto(input: {
  memoryId: string;
  requestId: string;
  bytes: Buffer;
}): Promise<Result<{ id: string }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const processed = await processPhoto(input.bytes);
  if (!processed.ok) {
    if (processed.error === "TOO_LARGE") return fail("PAYLOAD_TOO_LARGE", "התמונה גדולה מדי", traceId);
    if (processed.error === "UNSUPPORTED") {
      return fail("UNSUPPORTED_MEDIA_TYPE", "אפשר להעלות רק תמונות JPG, PNG או WebP", traceId);
    }
    return fail("INVALID_INPUT", "לא הצלחנו לקרוא את התמונה. נסו תמונה אחרת", traceId);
  }
  const { full, thumb, mime } = processed.photo;

  const service = createSupabaseServiceClient();
  const { data: photoId, error: createError } = await service.rpc("create_photo_upload", {
    p_actor: userId,
    p_request_id: input.requestId,
    p_memory_id: input.memoryId,
    p_declared_mime: mime,
    p_declared_size: full.length,
  });
  if (createError || !photoId) {
    const msg = rpcMessage(createError);
    if (msg.includes("QUOTA_EXCEEDED")) {
      return fail("VERSION_CONFLICT", `אפשר עד ${PHOTOS_PER_MEMORY} תמונות לכל זיכרון`, traceId);
    }
    if (msg.includes("NOT_FOUND")) return fail("NOT_FOUND", "הזיכרון הזה כבר לא זמין", traceId);
    if (msg.includes("VERSION_CONFLICT")) return fail("VERSION_CONFLICT", "ההעלאה כבר בוצעה. רעננו את המסך", traceId);
    return fail("UNEXPECTED", "ההעלאה נכשלה, נסו שוב", traceId);
  }

  const id = photoId as string;
  // הנתיב נקבע ב-DB (constraint: space/memory/photo) — לא מרכיבים אותו כאן.
  const { data: row } = await service
    .from("memory_photos")
    .select("object_path, status")
    .eq("id", id)
    .maybeSingle<{ object_path: string; status: string }>();
  if (!row) return fail("UNEXPECTED", "ההעלאה נכשלה, נסו שוב", traceId);
  // retry של אותה בקשה אחרי שכבר הושלמה — אין מה להעלות שוב.
  if (row.status === "ready") return ok({ id }, traceId);

  const bucket = service.storage.from(BUCKET);
  const opts = { contentType: mime, upsert: false, cacheControl: "0" };
  const [fullUp, thumbUp] = await Promise.all([
    bucket.upload(row.object_path, full, opts),
    bucket.upload(thumbPath(row.object_path), thumb, opts),
  ]);

  if (fullUp.error || thumbUp.error) {
    await bucket.remove([row.object_path, thumbPath(row.object_path)]);
    await service.rpc("abort_photo_upload", { p_actor: userId, p_photo_id: id });
    return fail("UNEXPECTED", "ההעלאה נכשלה, נסו שוב", traceId);
  }

  const { error: finalizeError } = await service.rpc("finalize_photo", {
    p_actor: userId,
    p_photo_id: id,
    p_mime: mime,
    p_size: full.length,
  });
  if (finalizeError) {
    await bucket.remove([row.object_path, thumbPath(row.object_path)]);
    await service.rpc("abort_photo_upload", { p_actor: userId, p_photo_id: id });
    return fail("UNEXPECTED", "ההעלאה נכשלה, נסו שוב", traceId);
  }

  return ok({ id }, traceId);
}

// מחיקה — רק מי שהעלה (spec). deleting מסתיר מיד; אם מחיקת האובייקט נכשלת
// השורה נשארת deleting (לא מוצגת לאף אחד) וניסיון חוזר ימשיך מאותה נקודה.
export async function deletePhoto(photoId: string): Promise<Result<{ id: string }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const service = createSupabaseServiceClient();
  const { data: path, error } = await service.rpc("begin_delete_photo", { p_actor: userId, p_photo_id: photoId });
  if (error || !path) {
    const msg = rpcMessage(error);
    if (msg.includes("NOT_AUTHOR")) return fail("NOT_FOUND", "אפשר למחוק רק תמונות שהעליתם", traceId);
    if (msg.includes("NOT_FOUND")) return fail("NOT_FOUND", "התמונה כבר נמחקה", traceId);
    return fail("UNEXPECTED", "המחיקה נכשלה, נסו שוב", traceId);
  }

  const objectPath = path as string;
  const { error: removeError } = await service.storage.from(BUCKET).remove([objectPath, thumbPath(objectPath)]);
  if (removeError) return fail("UNEXPECTED", "המחיקה נכשלה, נסו שוב", traceId);

  await service.rpc("finish_delete_photo", { p_actor: userId, p_photo_id: photoId });
  return ok({ id: photoId }, traceId);
}

// תוכן התמונה לצפייה. null = אין (לא מחובר / זר / לא ready / חסר) — תמיד
// אותה תשובה, כדי לא לחשוף אם מזהה קיים אצל מישהו אחר.
export async function getPhotoContent(photoId: string, variant: "full" | "thumb"): Promise<Blob | null> {
  const userId = await getVerifiedUserId();
  if (!userId) return null;

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("memory_photos")
    .select("object_path")
    .eq("id", photoId)
    .maybeSingle<{ object_path: string }>();
  if (!row) return null;

  const service = createSupabaseServiceClient();
  const path = variant === "thumb" ? thumbPath(row.object_path) : row.object_path;
  const { data } = await service.storage.from(BUCKET).download(path);
  return data ?? null;
}
