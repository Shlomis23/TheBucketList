import "server-only";

import { getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// Google Places (New) — שרת בלבד. GOOGLE_PLACES_API_KEY חי רק ב-Vercel
// (לא NEXT_PUBLIC, לא בדפדפן, לא ב-repo), כך שכל קריאה ל-Google עוברת
// דרכנו ואנחנו קובעים את התקרה — לא מכסות ה-Cloud Console.
//
// תקרות (DB-backed, public.check_rate_limit — עובד גם בין מופעי serverless):
//   - השלמה: 300 ביום לכל האפליקציה (~9,300 בחודש, מתחת ל-10,000 החינמיים)
//     ו-60 בשעה לכל משתמש (תקלה/לולאה לא תשרוף את היום).
//   - מיקום לניווט (Waze): 200 ביום לכל האפליקציה.
// מעבר לתקרה -> "לא זמין כרגע", והשדה ממשיך לעבוד כטקסט חופשי.
//
// שמירה: רק place_id נשמר ב-DB (מותר לפי תנאי Google). קואורדינטות נשלפות
// בזמן הלחיצה על "ניווט" ולא נשמרות.

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS_URL = "https://places.googleapis.com/v1/places/";

export type PlaceSuggestion = { placeId: string; main: string; secondary: string };

export type PlacesError = "UNAUTHENTICATED" | "RATE_LIMITED" | "UNAVAILABLE";

function apiKey() {
  return process.env.GOOGLE_PLACES_API_KEY || null;
}

async function allow(checks: { key: string; max: number; windowSeconds: number }[]): Promise<boolean> {
  const service = createSupabaseServiceClient();
  const results = await Promise.all(
    checks.map((c) =>
      service.rpc("check_rate_limit", { p_key: c.key, p_max: c.max, p_window_seconds: c.windowSeconds }),
    ),
  );
  return results.every((r) => !r.error && r.data === true);
}

// "רחוב הרצל 5, תל אביב-יפו, ישראל" -> בלי ", ישראל" בסוף: כל המקומות
// כמעט תמיד בארץ, וזה רק מאריך את השורה.
function trimCountry(text: string) {
  return text.replace(/,\s*(ישראל|Israel)\s*$/u, "").trim();
}

export async function autocompletePlaces(
  input: string,
  sessionToken: string,
): Promise<{ ok: true; suggestions: PlaceSuggestion[] } | { ok: false; error: PlacesError }> {
  const userId = await getVerifiedUserId();
  if (!userId) return { ok: false, error: "UNAUTHENTICATED" };
  const key = apiKey();
  if (!key) return { ok: false, error: "UNAVAILABLE" };

  const allowed = await allow([
    { key: "places_ac:day", max: 300, windowSeconds: 86_400 },
    { key: `places_ac:u:${userId}`, max: 60, windowSeconds: 3_600 },
  ]);
  if (!allowed) return { ok: false, error: "RATE_LIMITED" };

  try {
    const res = await fetch(AUTOCOMPLETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
      },
      body: JSON.stringify({
        input,
        sessionToken,
        languageCode: "he",
        // העדפה לישראל (לא הגבלה — טיול לחו"ל עדיין יימצא).
        regionCode: "il",
      }),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!res.ok) {
      // בלי המפתח ובלי הקלט בלוג — רק הסטטוס וקוד השגיאה של Google.
      const detail = await res.text().catch(() => "");
      console.error("places autocomplete failed", res.status, detail.slice(0, 300));
      return { ok: false, error: "UNAVAILABLE" };
    }
    const json = (await res.json()) as {
      suggestions?: {
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
        };
      }[];
    };
    const suggestions: PlaceSuggestion[] = [];
    for (const s of json.suggestions ?? []) {
      const p = s.placePrediction;
      if (!p?.placeId || !/^[A-Za-z0-9_-]{1,300}$/.test(p.placeId)) continue;
      const main = p.structuredFormat?.mainText?.text ?? p.text?.text ?? "";
      if (!main) continue;
      suggestions.push({
        placeId: p.placeId,
        main,
        secondary: trimCountry(p.structuredFormat?.secondaryText?.text ?? ""),
      });
    }
    return { ok: true, suggestions };
  } catch (e) {
    console.error("places autocomplete error", e instanceof Error ? e.name : "unknown");
    return { ok: false, error: "UNAVAILABLE" };
  }
}

export async function placeLocation(
  placeId: string,
): Promise<{ ok: true; lat: number; lng: number } | { ok: false; error: PlacesError }> {
  const userId = await getVerifiedUserId();
  if (!userId) return { ok: false, error: "UNAUTHENTICATED" };
  const key = apiKey();
  if (!key) return { ok: false, error: "UNAVAILABLE" };

  const allowed = await allow([{ key: "places_loc:day", max: 200, windowSeconds: 86_400 }]);
  if (!allowed) return { ok: false, error: "RATE_LIMITED" };

  try {
    const res = await fetch(`${DETAILS_URL}${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location" },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("places location failed", res.status, detail.slice(0, 300));
      return { ok: false, error: "UNAVAILABLE" };
    }
    const json = (await res.json()) as { location?: { latitude?: number; longitude?: number } };
    const lat = json.location?.latitude;
    const lng = json.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return { ok: false, error: "UNAVAILABLE" };
    return { ok: true, lat, lng };
  } catch (e) {
    console.error("places location error", e instanceof Error ? e.name : "unknown");
    return { ok: false, error: "UNAVAILABLE" };
  }
}
