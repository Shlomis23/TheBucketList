import { NextResponse, type NextRequest } from "next/server";

// POST /api/invitations/exchange — spec סעיף 11.2, 13.2.
// מקבל token מה-fragment (נשלח מהלקוח אחרי ניקוי מה-URL), ולא קובע חברות.
// TODO: אימות אורך/קידוד, rate limit (5 הנפקות/שעה, 20 בדיקות/15 דק'/IP),
// שמירת cookie זמני חתום/מוצפן/HttpOnly. אין לרשום token גולמי ב-logs.
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { ok: false, error: { code: "UNEXPECTED", message: "טרם מומש" } },
    { status: 501 },
  );
}
