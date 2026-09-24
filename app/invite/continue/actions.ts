"use server";

import { redirect } from "next/navigation";
import { updateMyProfile } from "@/lib/dal/profile";
import { acceptInvitation } from "@/lib/dal/invitations";
import { consumeInviteCookie } from "@/lib/invitations/cookie";
import type { Result } from "@/lib/errors/result";
import { fail } from "@/lib/errors/result";

// acceptInvitationAction — spec סעיף 13.2 (acceptInvitation): ללא actor/token
// בטופס. token מגיע מה-cookie הזמני; actor מה-session המאומת (בתוך
// acceptInvitation/getVerifiedUserId). displayName אופציונלי — רק כשעדיין
// אין profile (spec 10.3: "יש ליצור profile לפני הקבלה"). ה-cookie תמיד
// מנוקה בסוף, הצלחה או כישלון כאחד.
export async function acceptInvitationAction(
  input: { displayName?: string } = {},
): Promise<Result<never> | undefined> {
  const invite = await consumeInviteCookie();
  if (!invite) {
    return fail(
      "NOT_FOUND",
      "קישור ההזמנה פג תוקף. אפשר לפתוח שוב את הקישור מבן/בת הזוג.",
      crypto.randomUUID(),
    );
  }

  if (input.displayName && input.displayName.trim()) {
    const profileResult = await updateMyProfile(input.displayName);
    if (!profileResult.ok) return profileResult;
  }

  const result = await acceptInvitation(invite.tokenHash);
  if (!result.ok) return result;

  redirect("/");
}
