import "server-only";

import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// cookie זמני, חתום ומוצפן, HttpOnly — spec סעיף 10.3, 11.2, 13.2.
// שומר רק את ה-hash של הטוקן (לא את הטוקן הגולמי עצמו — אין צורך בו יותר
// אחרי ה-exchange, ו-accept_invitation_internal מקבלת ממילא p_token_hash).
// AES-256-GCM (הצפנה+אימות יחד) עם מפתח שנגזר מ-INVITE_COOKIE_SECRET —
// ללא ספריית חתימה חיצונית, node:crypto מספיק לצורך הזה.
const COOKIE_NAME = "tbl_invite";
const ALGORITHM = "aes-256-gcm";
const MAX_AGE_SECONDS = 30 * 60; // 30 דק' — קצר יחסית לתוקף ההזמנה עצמה (48 שעות).

type InviteCookiePayload = { tokenHash: string; expiresAtMs: number };

function getKey(): Buffer {
  const secret = process.env.INVITE_COOKIE_SECRET;
  if (!secret) {
    throw new Error("חסר משתנה סביבה INVITE_COOKIE_SECRET");
  }
  // SHA-256 של הסוד -> תמיד בדיוק 32 בייט, בלי תלות בפורמט/אורך הסוד הגולמי.
  return createHash("sha256").update(secret).digest();
}

function encrypt(payload: InviteCookiePayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const enc = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, enc, tag].map((b) => b.toString("base64url")).join(".");
}

function decrypt(value: string): InviteCookiePayload | null {
  try {
    const [ivB64, encB64, tagB64] = value.split(".");
    if (!ivB64 || !encB64 || !tagB64) return null;
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(encB64, "base64url")),
      decipher.final(),
    ]);
    const parsed = JSON.parse(dec.toString("utf8")) as Partial<InviteCookiePayload>;
    if (typeof parsed.tokenHash !== "string" || typeof parsed.expiresAtMs !== "number") {
      return null;
    }
    if (parsed.expiresAtMs <= Date.now()) return null;
    return { tokenHash: parsed.tokenHash, expiresAtMs: parsed.expiresAtMs };
  } catch {
    // ערך פגום/מזויף/מפתח שהתחלף — לא לחשוף פרטים, פשוט להתייחס כלא קיים.
    return null;
  }
}

// נקרא מתוך Route Handler (POST /api/invitations/exchange) אחרי בדיקות
// אורך/קידוד ו-rate limit. p_token_hash בלבד — הטוקן הגולמי לא נשמר בשום מקום.
export async function setInviteCookie(tokenHash: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAtMs = Date.now() + MAX_AGE_SECONDS * 1000;
  cookieStore.set(COOKIE_NAME, encrypt({ tokenHash, expiresAtMs }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

// קריאה בלבד — לשימוש ב-Server Components (למשל /invite/continue,
// /auth/callback) כדי להחליט על ניתוב בלי לגעת ב-cookie עצמו.
export async function peekInviteCookie(): Promise<{ tokenHash: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const decrypted = decrypt(raw);
  return decrypted ? { tokenHash: decrypted.tokenHash } : null;
}

// קריאה + מחיקה — לשימוש רק מתוך Server Action/Route Handler שבאמת מנסה
// לקבל את ההזמנה (acceptInvitationAction). הניקוי קורה תמיד אחרי ניסיון,
// הצלחה או כישלון כאחד — cookie זמני אינו אמור להישאר.
export async function consumeInviteCookie(): Promise<{ tokenHash: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  cookieStore.delete(COOKIE_NAME);
  if (!raw) return null;
  const decrypted = decrypt(raw);
  return decrypted ? { tokenHash: decrypted.tokenHash } : null;
}
