// חוזה תוצאה משותף לכל Server Action / Route Handler.
// ראו docs/The-Bucket-List-Technical-Spec-HE.md סעיף 13.1.
//
// הודעת השגיאה המוצגת למשתמש חייבת להיות אנושית ובעברית.
// אסור לחשוף SQL, פרטי ספק או stack trace ב-message.

export type Result<T> =
  | { ok: true; data: T; requestId: string }
  | {
      ok: false;
      error: {
        code: ErrorCode;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
      requestId: string;
    };

// קודים מוסכמים, ממופים בזמן ה-Route Handler לפי סעיף 13.1:
// 400 קלט, 401 ללא אימות, 404 חסר/זר, 409 גרסה/מצב, 413 גודל,
// 415 סוג קובץ, 429 קצב, 500 שגיאה לא צפויה.
export type ErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "UNEXPECTED";

export function ok<T>(data: T, requestId: string): Result<T> {
  return { ok: true, data, requestId };
}

export function fail(
  code: ErrorCode,
  message: string,
  requestId: string,
  fieldErrors?: Record<string, string[]>,
): Result<never> {
  return { ok: false, error: { code, message, fieldErrors }, requestId };
}
