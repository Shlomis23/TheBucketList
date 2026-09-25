import "server-only";

import sharp from "sharp";

// עיבוד תמונה בשרת — spec סעיף 11.3 ("אימות magic bytes + מגבלת פיקסלים,
// הסרת EXIF/GPS/שם קובץ"). הלקוח כבר מקטין לפני השליחה (PhotoUploader),
// אבל על זה לא סומכים: כל קובץ מפוענח מחדש ומקודד מחדש כאן, כך שמה שנשמר
// ב-Storage הוא תמיד JPEG נקי שנוצר על ידינו — בלי מטא-דאטה (מיקום GPS,
// דגם מכשיר), בלי תוכן מוסתר, ובגודל צפוי.
//
// שני קבצים לכל תמונה: מלא (עד 1600px בצלע הארוכה) לצפייה, וממוזער (480px
// בצלע הקצרה) לגריד ולכרטיס — כך מסך זיכרון עם 10 תמונות מוריד ~0.5MB
// ולא ~4MB, וזה שומר גם על מכסת התעבורה החינמית של Supabase.

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // מתחת ל-4.5MB של Vercel
const MAX_INPUT_PIXELS = 40_000_000; // ~40MP — מספיק לכל מצלמת טלפון, חוסם "פצצות פענוח"
const FULL_EDGE = 1600;
const THUMB_EDGE = 480;

export type ProcessedPhoto = { full: Buffer; thumb: Buffer; mime: "image/jpeg" };

export type ProcessError = "UNSUPPORTED" | "TOO_LARGE" | "INVALID";

// רק שלושת הפורמטים שה-bucket וה-DB מתירים. HEIC לא ברשימה: באייפון
// הדפדפן ממיר ל-JPEG בבחירה מהגלריה, ומה שבכל זאת מגיע כ-HEIC נדחה בהודעה ברורה.
export function sniffImageType(buf: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // RIFF
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50 // WEBP
  ) {
    return "image/webp";
  }
  return null;
}

export async function processPhoto(input: Buffer): Promise<{ ok: true; photo: ProcessedPhoto } | { ok: false; error: ProcessError }> {
  if (input.length > MAX_UPLOAD_BYTES) return { ok: false, error: "TOO_LARGE" };
  if (!sniffImageType(input)) return { ok: false, error: "UNSUPPORTED" };

  try {
    // rotate() בלי פרמטרים = לפי EXIF Orientation, ואז המטא-דאטה נזרק
    // (sharp לא מעתיק EXIF לפלט אלא אם מבקשים withMetadata).
    const base = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error", animated: false }).rotate();

    const [full, thumb] = await Promise.all([
      base
        .clone()
        .resize({ width: FULL_EDGE, height: FULL_EDGE, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" }) // PNG שקוף -> רקע לבן, לא שחור
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer(),
      base
        .clone()
        .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "outside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer(),
    ]);

    return { ok: true, photo: { full, thumb, mime: "image/jpeg" } };
  } catch {
    // פענוח נכשל / חורג ממגבלת הפיקסלים / קובץ פגום.
    return { ok: false, error: "INVALID" };
  }
}

export function thumbPath(objectPath: string) {
  return `${objectPath}.t`;
}
