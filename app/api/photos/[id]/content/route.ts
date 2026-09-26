import { type NextRequest } from "next/server";
import { z } from "zod";
import { getPhotoContent } from "@/lib/dal/photos";

// GET /api/photos/[id]/content[?v=thumb] — spec 11.3/13.3. בכל בקשה: session
// + RLS על השורה (חבר במרחב, status='ready'), ורק אז הקובץ מה-bucket הפרטי.
// זר/חסר/נמחק -> 404 זהה.
//
// Cache: private (רק הדפדפן של המשתמש, אף פעם לא CDN משותף), 30 יום,
// immutable. הקובץ לעולם לא משתנה תחת אותו מזהה (תמונה חדשה = מזהה חדש),
// כך שחזרה למסך הזיכרונות לא מורידה שוב אף תמונה (26.9, שיפור מהירות).
// תמונה שנמחקה נעלמת מהמסכים מיד — היא פשוט לא מופיעה יותר ברשימה; העותק
// במטמון המכשיר לא נגיש מאף מסך ונמחק כשהתוקף פג.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notFound = () =>
    new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });

  if (!z.uuid().safeParse(id).success) return notFound();
  const variant = request.nextUrl.searchParams.get("v") === "thumb" ? "thumb" : "full";

  const blob = await getPhotoContent(id, variant);
  if (!blob) return notFound();

  return new Response(blob.stream(), {
    headers: {
      // כל מה שנשמר עבר קידוד מחדש ל-JPEG בשרת (lib/photos/process.ts).
      "Content-Type": "image/jpeg",
      "Content-Length": String(blob.size),
      "Cache-Control": "private, max-age=2592000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
