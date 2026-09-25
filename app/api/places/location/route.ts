import { NextResponse, type NextRequest } from "next/server";
import { placeLocation } from "@/lib/places/google";

// GET /api/places/location?id=<place_id> — קואורדינטות לניווט ב-Waze, נשלפות
// ברגע שפותחים את בחירת הניווט (לא נשמרות — תנאי Google). Google Maps לא
// צריך את זה: הוא מקבל את ה-place_id ישירות בקישור.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[A-Za-z0-9_-]{1,300}$/.test(id)) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  // אותו אתר בלבד (Sec-Fetch-Site נשלח ע"י כל דפדפן מודרני).
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const result = await placeLocation(id);
  if (!result.ok) {
    const status = result.error === "UNAUTHENTICATED" ? 401 : result.error === "RATE_LIMITED" ? 429 : 503;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json(
    { ok: true, lat: result.lat, lng: result.lng },
    // הדפדפן יכול לזכור לשעה (פתיחה חוזרת של הניווט לא עולה קריאה נוספת).
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
