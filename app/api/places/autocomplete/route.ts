import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { autocompletePlaces } from "@/lib/places/google";

// POST /api/places/autocomplete — השלמת מקום לשדה "מקום" ברעיון.
// Route Handler ולא Server Action: Server Actions רצות אחת-אחת בתור, וכאן
// צריך שבקשה חדשה (עוד אות) תוכל לבטל את הקודמת.
const bodySchema = z.object({
  q: z.string().trim().min(2).max(120),
  // מושב השלמה של Google: עד 36 תווים URL-safe (UUID מהדפדפן).
  sessionToken: z.string().regex(/^[A-Za-z0-9_-]{8,36}$/),
});

const STATUS = { UNAUTHENTICATED: 401, RATE_LIMITED: 429, UNAVAILABLE: 503 } as const;

export async function POST(request: NextRequest) {
  let originHost: string | null = null;
  try {
    originHost = new URL(request.headers.get("origin") ?? "").host;
  } catch {}
  if (!originHost || originHost !== request.headers.get("host")) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });

  const result = await autocompletePlaces(parsed.data.q, parsed.data.sessionToken);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: STATUS[result.error] });
  return NextResponse.json(
    { ok: true, suggestions: result.suggestions },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
