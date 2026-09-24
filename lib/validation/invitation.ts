import { z } from "zod";

// גבולות שדה הזמנה — spec סעיף 10.3, 13.2. אלה בדיקות UX; האכיפה האמיתית
// היא ה-CHECK constraints וה-RPC (supabase/migrations/0011_invitation_rpcs.sql,
// 0012_fix_create_invitation_ambiguous_id.sql).
export const createInvitationSchema = z.object({
  targetEmail: z.string().trim().min(3).max(254).email("כתובת אימייל לא תקינה"),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const invitationIdSchema = z.object({
  invitationId: z.string().uuid(),
});
export type InvitationIdInput = z.infer<typeof invitationIdSchema>;

// טוקן גולמי כפי שנוצר ב-lib/dal/invitations.ts: 32 בייט CSPRNG, base64url
// בלי padding -> תמיד בדיוק 43 תווים מהא"ב [A-Za-z0-9_-]. נבדק גם ב-Route
// Handler לפני חישוב hash/rate limit (spec: "אורך/קידוד").
export const inviteTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "טוקן לא תקין");

export function maskedStatusLabel(status: "pending" | "accepted" | "revoked"): string {
  if (status === "pending") return "ממתינה לאישור";
  if (status === "accepted") return "התקבלה";
  return "בוטלה";
}
