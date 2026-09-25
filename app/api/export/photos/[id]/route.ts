import { type NextRequest } from "next/server";
import { z } from "zod";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// GET /api/export/photos/[id] — תמונה מלאה לקובץ ה-ZIP. כמו
// /api/photos/[id]/content, אבל ההרשאה דרך export_photo_path (0020) — עובד
// גם כשהמרחב סגור ו-RLS כבר חוסמת (בתקופת החרטה בלבד).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  if (!z.uuid().safeParse(id).success) return notFound();

  const userId = await getVerifiedUserId();
  if (!userId) return notFound();

  const service = createSupabaseServiceClient();
  const { data: path } = await service.rpc("export_photo_path", { p_actor: userId, p_photo_id: id });
  if (!path) return notFound();

  const { data: blob } = await service.storage.from("memories-private").download(path as string);
  if (!blob) return notFound();

  return new Response(blob.stream(), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(blob.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
