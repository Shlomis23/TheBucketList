import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { cleanupStalePhotos, listSpacesDueForPurge, purgeSpaceNow } from "@/lib/purge";

// משימה יומית (vercel.json -> crons). Vercel שולח Authorization: Bearer
// <CRON_SECRET>; בלי הסוד — 401, כך שאף אחד מבחוץ לא יכול להפעיל מחיקה.
//
//   1. מחיקה סופית של מרחבים שתקופת החרטה שלהם (14 יום) נגמרה.
//   2. ניקוי העלאות תמונה שנתקעו באמצע.
//   3. בדרך אגב — פעילות יומית מול Supabase, כך שהפרויקט בתוכנית החינמית
//      לא מושבת אחרי 7 ימים בלי שימוש.
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });

  const summary = { purged: 0, purgeFailed: 0, stalePhotos: 0, errors: [] as string[] };

  try {
    for (const spaceId of await listSpacesDueForPurge()) {
      if (await purgeSpaceNow(spaceId)) summary.purged++;
      else summary.purgeFailed++;
    }
  } catch (e) {
    summary.errors.push(e instanceof Error ? e.message : "purge list failed");
  }

  try {
    summary.stalePhotos = await cleanupStalePhotos();
  } catch (e) {
    summary.errors.push(e instanceof Error ? e.message : "stale cleanup failed");
  }

  console.log("daily job", JSON.stringify(summary));
  return NextResponse.json({ ok: summary.errors.length === 0 && summary.purgeFailed === 0, ...summary });
}
