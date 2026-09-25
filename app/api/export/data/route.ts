import { NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// GET /api/export/data — כל התוכן לקובץ ה-ZIP (זיכרונות, רעיונות, מזהי
// תמונות). export_space_data (0020) מאשר רק חבר במרחב פתוח, או סגור שעוד
// לא נמחק — כך גם בן/בת הזוג שלא סגר/ה יכולים להוריד בזמן החרטה.
export async function GET() {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("export_space_data", { p_actor: userId });
  if (error || !data) return NextResponse.json({ ok: false }, { status: 404 });

  return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "private, no-store" } });
}
