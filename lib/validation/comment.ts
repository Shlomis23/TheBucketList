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
