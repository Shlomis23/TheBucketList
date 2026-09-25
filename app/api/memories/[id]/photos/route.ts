import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { uploadPhoto } from "@/lib/dal/photos";
import { MAX_UPLOAD_BYTES } from "@/lib/photos/process";
import type { ErrorCode } from "@/lib/errors/result";

// POST /api/memories/[id]/photos — העלאת תמונה אחת לזיכרון (spec 11.3).
// גוף הבקשה = הבייטים של התמונה (לא multipart), X-Request-Id לאידמפוטנטיות.
// Route Handler ולא Server Action: כך הקריאה מוגבלת בגודל תוך כדי קריאה,
// ובלי קידוד base64 שמנפח את הגוף ב-33%.

const STATUS: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  UNEXPECTED: 500,
};

function error(code: ErrorCode, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status: STATUS[code] });
}

// קורא את הגוף עד תקרה — לא סומכים על Content-Length בלבד.
async function readLimited(request: NextRequest, limit: number): Promise<Buffer | null> {
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // CSRF: רק מהאתר עצמו (ה-cookie ממילא SameSite=Lax, זו שכבה נוספת).
  let originHost: string | null = null;
  try {
    originHost = new URL(request.headers.get("origin") ?? "").host;
  } catch {
    // "null" / חסר / פגום
  }
  if (!originHost || originHost !== request.headers.get("host")) {
    return error("INVALID_INPUT", "בקשה לא תקינה");
  }

  const { id } = await params;
  const memoryId = z.uuid().safeParse(id);
  const requestId = z.uuid().safeParse(request.headers.get("x-request-id"));
  if (!memoryId.success || !requestId.success) return error("INVALID_INPUT", "בקשה לא תקינה");

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES) return error("PAYLOAD_TOO_LARGE", "התמונה גדולה מדי");

  const bytes = await readLimited(request, MAX_UPLOAD_BYTES);
  if (!bytes) return error("PAYLOAD_TOO_LARGE", "התמונה גדולה מדי");
  if (bytes.length === 0) return error("INVALID_INPUT", "לא התקבלה תמונה");

  const result = await uploadPhoto({ memoryId: memoryId.data, requestId: requestId.data, bytes });
  if (!result.ok) return error(result.error.code, result.error.message);

  revalidatePath(`/memories/${memoryId.data}`);
  revalidatePath("/memories");
  revalidatePath("/");
  return NextResponse.json({ ok: true, data: result.data });
}
