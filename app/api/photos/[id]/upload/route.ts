import { NextResponse, type NextRequest } from "next/server";

// POST /api/photos/[id]/upload — spec סעיף 11.3, 13.2.
// TODO: בדיקת origin+session, מגבלת 10MiB לפני buffering מלא, אימות
// magic bytes + מגבלת פיקסלים, הסרת EXIF/GPS/שם קובץ, finalize עם בדיקה חוזרת.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json(
    { ok: false, error: { code: "UNEXPECTED", message: `טרם מומש (${id})` } },
    { status: 501 },
  );
}
