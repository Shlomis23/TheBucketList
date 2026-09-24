import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId } from "@/lib/dal/space";
import { peekInviteCookie } from "@/lib/invitations/cookie";
import { OnboardingForm } from "./OnboardingForm";

// התחלה `/onboarding` — F1, spec סעיף 5, 6.
// קבלת הזמנה קיימת (F2) זורמת דרך /invite -> /invite/continue, לא דרך כאן —
// אבל אם יש cookie הזמנה זמני תקף (המשתמש עדיין לא הצטרף), חייבים לנתב
// לשם במקום לתת "יצירת מרחב" כאן: יצירת מרחב חדש הייתה נועלת מ-ALREADY_IN_SPACE
// את הקבלה בהמשך (accept_invitation_internal בודק חברות קיימת).
export default async function OnboardingPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const spaceId = await getMySpaceId();
  if (spaceId) redirect("/");

  const invite = await peekInviteCookie();
  if (invite) redirect("/invite/continue");

  return (
    <div className="page" style={{ paddingTop: "calc(48px + var(--safe-area-top))" }}>
      <p className="page-eyebrow">The Bucket List</p>
      <h1 className="page-title">ברוכים הבאים</h1>
      <p className="page-subtitle">איך לקרוא לך?</p>
      <div className="card">
        <OnboardingForm />
      </div>
    </div>
  );
}
