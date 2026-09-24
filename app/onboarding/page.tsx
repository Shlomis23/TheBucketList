import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId, hasPendingInvitationForMe } from "@/lib/dal/space";
import { peekInviteCookie } from "@/lib/invitations/cookie";
import { OnboardingForm } from "./OnboardingForm";

// התחלה `/onboarding` — F1, spec סעיף 5, 6.
// קבלת הזמנה קיימת (F2) זורמת דרך /invite -> /invite/continue, לא דרך כאן —
// אבל אם יש cookie הזמנה זמני תקף (המשתמש עדיין לא הצטרף), חייבים לנתב
// לשם במקום לתת "יצירת מרחב" כאן: יצירת מרחב חדש הייתה נועלת מ-ALREADY_IN_SPACE
// את הקבלה בהמשך (accept_invitation_internal בודק חברות קיימת).
//
// ה-cookie לבדו לא אמין מספיק (ראו 0013_block_create_space_with_pending_invite.sql
// לתקרית אמיתית שבה הוא נעלם בין שני ניסיונות כניסה) — לכן גם כשאין cookie
// תקף, בודקים ישירות מול ה-DB אם יש הזמנה ממתינה לאימייל הזה ומראים הודעה
// ברורה במקום טופס "יצירת מרחב" (create_space עצמה חוסמת את זה בכל מקרה,
// זו רק הודעה נעימה יותר במקום ליפול אחרי מילוי השם).
export default async function OnboardingPage() {
  // userId ו-spaceId לא תלויים זה בזה — במקביל במקום ברצף (ראו app/(app)/page.tsx).
  const [userId, spaceId] = await Promise.all([getVerifiedUserId(), getMySpaceId()]);
  if (!userId) redirect("/login");
  if (spaceId) redirect("/");

  const invite = await peekInviteCookie();
  if (invite) redirect("/invite/continue");

  const pendingInvitation = await hasPendingInvitationForMe();
  if (pendingInvitation) {
    return (
      <div className="page" style={{ paddingTop: "calc(48px + var(--safe-area-top))" }}>
        <p className="page-eyebrow">The Bucket List</p>
        <h1 className="page-title">יש לכם הזמנה ממתינה</h1>
        <p className="page-subtitle">
          בן/בת הזוג כבר הזמינו אתכם למרחב המשותף שלהם. כדי להצטרף אליו, אפשר
          לפתוח שוב את קישור ההזמנה ששלחו לכם וללחוץ על &quot;ממשיכים&quot;.
        </p>
      </div>
    );
  }

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
