import { z } from "zod";

// תגובת טקסט על רעיון — spec סעיף 6.1: 1–1,000 תווים, טקסט בלבד.
// האכיפה האמיתית ב-CHECK של idea_comments וב-RPC (0017); זה UX.
export const COMMENT_MAX = 1000;

const body = z
  .string()
  .trim()
  .min(1, "אי אפשר לשלוח הודעה ריקה")
  .max(COMMENT_MAX, `עד ${COMMENT_MAX.toLocaleString("he-IL")} תווים`);

export const addCommentSchema = z.object({
  requestId: z.string().uuid(),
  ideaId: z.string().uuid(),
  body,
});

export const editCommentSchema = z.object({
  ideaId: z.string().uuid(),
  commentId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  body,
});

export const deleteCommentSchema = z.object({
  ideaId: z.string().uuid(),
  commentId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type EditCommentInput = z.infer<typeof editCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;

// "עכשיו" / "לפני 5 דק׳" / "היום 21:40" / "אתמול 21:40" / "3 בספט׳ 21:40".
// מחושב בשרת בזמן הרינדור (לא ברכיב הלקוח) כדי שלא יהיה hydration mismatch
// בין שעון השרת לשעון הדפדפן. אזור זמן קבוע — ישראל.
export function formatCommentTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1) return "עכשיו";
  if (diffMin < 60) return `לפני ${diffMin} דק׳`;

  const tz = "Asia/Jerusalem";
  const dayKey = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(x);
  const time = new Intl.DateTimeFormat("he-IL", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey(d) === dayKey(now)) return `היום ${time}`;
  if (dayKey(d) === dayKey(yesterday)) return `אתמול ${time}`;
  const date = new Intl.DateTimeFormat("he-IL", { timeZone: tz, day: "numeric", month: "short" }).format(d);
  return `${date} ${time}`;
}

// קישורים בטקסט — משותף ל-IdeaConversation (הפיכה ללחיצים) ולדף התוכנית
// ("קישורים מהשיחה"), כדי שיהיה כלל אחד.
//
// 25.9: קישור שנכתב ידנית באייפון נשמר כ-"Https://mako.co.il" (המקלדת
// מגדילה אות ראשונה), והזיהוי הקודם — https:// באותיות קטנות בלבד — פספס
// אותו. עכשיו מזוהים, בלי תלות ברישיות:
//   - https://...           (כתובת מלאה)
//   - www....               (בלי סכמה)
//   - דומיין "חשוף" עם סיומת מוכרת: mako.co.il, example.com/path
// ה-href תמיד נבנה כ-https:// + השאר — אין מצב שבו נוצר javascript:/data:,
// ו-http:// "משודרג" ל-https.
// בלי lookbehind ב-regex (Safari ישן זורק SyntaxError) — הבדיקה "לא חלק
// מכתובת מייל" נעשית בקוד.
const LINK_RE =
  /(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:co\.il|org\.il|gov\.il|ac\.il|net\.il|muni\.il|com|org|net|il|io|app|me|info|co)\b(?:\/[^\s<>"']*)?/gi;

export type TextToken = { type: "text"; value: string } | { type: "link"; value: string; href: string };

// מפריד סימני פיסוק שנדבקו לסוף קישור ("...co.il." / "(ראו https://x)").
export function splitTrailingPunctuation(raw: string): { url: string; trailing: string } {
  const trailing = raw.match(/[.,!?;:)\]]+$/)?.[0] ?? "";
  return { url: trailing ? raw.slice(0, -trailing.length) : raw, trailing };
}

function toHref(url: string): string {
  const rest = url.replace(/^https?:\/\//i, "");
  return `https://${rest}`;
}

export function tokenizeLinks(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const start = m.index ?? 0;
    const prev = start > 0 ? text[start - 1] : "";
    // חלק מכתובת מייל (name@mako.co.il) או מהמשך מילה/כתובת — לא קישור.
    if (prev === "@" || prev === "." || prev === "/" || /[a-z0-9-]/i.test(prev)) continue;
    const { url, trailing } = splitTrailingPunctuation(m[0]);
    if (!url.includes(".")) continue;
    if (start > last) tokens.push({ type: "text", value: text.slice(last, start) });
    tokens.push({ type: "link", value: url, href: toHref(url) });
    if (trailing) tokens.push({ type: "text", value: trailing });
    last = start + m[0].length;
  }
  if (last < text.length) tokens.push({ type: "text", value: text.slice(last) });
  return tokens;
}

export function extractHttpsLinks(text: string): string[] {
  return tokenizeLinks(text).flatMap((t) => (t.type === "link" ? [t.href] : []));
}

// תווית קצרה לקישור: בלי https://, בלי / בסוף, עד ~38 תווים.
export function shortLinkLabel(url: string, max = 38): string {
  const label = url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return label.length > max ? `${label.slice(0, max - 2)}…` : label;
}

// שם האתר בלבד ("tickets.example.co.il") — לשורה שמשלבת עברית וכתובת.
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return shortLinkLabel(url, 24);
  }
}
