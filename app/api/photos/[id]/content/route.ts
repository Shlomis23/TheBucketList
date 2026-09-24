import { NextResponse, type NextRequest } from "next/server";

// GET /api/photos/[id]/content — spec סעיף 11.3, 13.3.
// TODO: אימות + בדיקת חברות + status='ready' בכל בקשה, הזרמת הקובץ עם
// Cache-Control: private, no-store ו-X-Content-Type-Options: nosniff.
// אין public URL לתמונה פרטית בשום מצב.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json(
    { ok: false, error: { code: "UNEXPECTED", message: `טרם מומש (${id})` } },
    { status: 501, headers: { "Cache-Control": "private, no-store" } },
  );
}
