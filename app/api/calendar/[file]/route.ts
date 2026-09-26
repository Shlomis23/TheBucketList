import { type NextRequest } from "next/server";
import { buildCalendar } from "@/lib/calendar";
import { getCalendarFeedPlans } from "@/lib/dal/calendar";

// GET /api/calendar/<token>.ics — היומן במינוי (0037, 26.9). אפליקציית היומן
// (אייפון/גוגל) מושכת את הכתובת הזו לבד, בלי עוגיות — הטוקן האישי והסודי הוא
// ההרשאה. טוקן לא קיים או שאופס -> 404 (היומן מפסיק להתעדכן).
export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const m = /^([0-9a-f]{64})\.ics$/.exec(file);
  if (!m) return notFound();

  const plans = await getCalendarFeedPlans(m[1]);
  if (!plans) return notFound();

  const origin = request.nextUrl.origin;
  const ics = buildCalendar(
    plans.map((p) => ({
      uid: `plan-${p.id}@the-bucket-list`,
      title: p.title,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      location: p.meeting_place,
      notes: p.notes,
      url: `${origin}/plans/${p.id}`,
      updatedAt: p.updated_at,
    })),
    { name: "The Bucket List" },
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="the-bucket-list.ics"',
      // אישי — אף פעם לא במטמון משותף; רענון מלא בכל משיכה של היומן.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
