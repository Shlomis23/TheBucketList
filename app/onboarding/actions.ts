"use server";

import { redirect } from "next/navigation";
import { updateMyProfile } from "@/lib/dal/profile";
import { createSpace } from "@/lib/dal/space";

// F1 — spec סעיף 5: שם תצוגה -> "יצירת הרשימה שלנו" -> יצירת מרחב וחברות
// slot 1. הזמנת בן/בת הזוג היא F2, בנויה בנפרד תחת /settings ו-/invite
// (lib/dal/invitations.ts, app/invite/) — לא כאן.
export async function createSpaceAction(input: { requestId: string; displayName: string }) {
  const profileResult = await updateMyProfile(input.displayName);
  if (!profileResult.ok) return profileResult;

  const spaceResult = await createSpace({ requestId: input.requestId, timezone: "Asia/Jerusalem" });
  if (!spaceResult.ok) return spaceResult;

  redirect("/");
}
