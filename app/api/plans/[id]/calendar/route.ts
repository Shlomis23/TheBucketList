import { type NextRequest } from "next/server";
import { z } from "zod";
import { buildIcs } from "@/lib/calendar";
import { verifyCalendarToken } from "@/lib/calendarToken";
import { getPlan } from "@/lib/dal/plans";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// GET /api/plans/[id]/calendar — קובץ .ics לתוכנית (26.9, "הוספה ליומן").
// הרשאה: קישור חתום מדף התוכנית (lib/calendarToken.ts — עובד גם בחלון Safari
// בלי התחברות), או התחברות רגילה + RLS. זר/חסר/בלי מועד -> 404 זהה.
type Row = { id: string; title: string; status: string; starts_at: string | null; ends_at: string | null; meeting_place: string | null; notes: string };

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notFound = () =>
    new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  if (!z.uuid().safeParse(id).success) return notFound();

  const sp = request.nextUrl.searchParams;
  let row: Row | null = null;
  if (verifyCalendarToken(id, sp.get("exp"), sp.get("sig"))) {
    const { data } = await createSupabaseServiceClient()
      .from("plans")
      .select("id, title, status, starts_at, ends_at, meeting_place, notes")
      .eq("id", id)
      .maybeSingle<Row>();
    row = data;
  } else {
    const plan = await getPlan(id);
    row = plan
      ? { id: plan.id, title: plan.title, status: plan.status, starts_at: plan.startsAt, ends_at: plan.endsAt, meeting_place: plan.meetingPlace, notes: plan.notes }
      : null;
  }
  if (!row || row.status !== "proposed" || !row.starts_at) return notFound();

  const ics = buildIcs({
    uid: `plan-${row.id}@the-bucket-list`,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.meeting_place,
    notes: row.notes,
    url: `${request.nextUrl.origin}/plans/${row.id}`,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="bucket-list-plan.ics"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
