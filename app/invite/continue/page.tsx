import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/dal/profile";
import { peekInviteCookie } from "@/lib/invitations/cookie";
import { LoginForm } from "@/app/(auth)/login/LoginForm";
import { AcceptInviteForm } from "./AcceptInviteForm";

// המשך הצטרפות `/invite/continue` — F2, spec סעיף 5, 10.3.
// מגיעים לכאן אחרי לחיצה על "ממשיכים" ב-/invite (cookie זמני כבר נשמר),
// או חזרה מ-/auth/callback אחרי קישור כניסה כשה-cookie עדיין תקף.
// שלושה מצבים: אין cookie תקף (פג/לא נשלח) -> הודעה ובקשת קישור חדש;
// יש cookie אבל אין session -> טופס כניסה (OTP, אותו LoginForm כמו /login);
// יש session -> טופס סיום (שם אם צריך profile, ואז accept).
export default async function InviteContinuePage() {
  const invite = await peekInviteCookie();

  if (!invite) {
    return (
      <div className="page" style={{ paddingTop: "calc(48px + var(--safe-area-top))" }}>
        <h1 className="page-title">ההזמנה פגה</h1>
        <p className="page-subtitle">
          קישור ההזמנה כבר לא זמין. אפשר לפתוח שוב את הקישור ששלחו לכם, או לבקש קישור חדש.
        </p>
      </div>
    );
  }

  const userId = await getVerifiedUserId();
  if (!userId) {
    return (
      <div className="page" style={{ paddingTop: "calc(48px + var(--safe-area-top))" }}>
        <p className="page-eyebrow">The Bucket List</p>
        <h1 className="page-title">כניסה להצטרפות</h1>
        <p className="page-subtitle">מתחברים כדי להשלים את ההצטרפות למרחב המשותף.</p>
        <div className="card">
          <LoginForm />
        </div>
      </div>
    );
  }

  const profile = await getMyProfile();

  return (
    <div className="page" style={{ paddingTop: "calc(48px + var(--safe-area-top))" }}>
      <p className="page-eyebrow">The Bucket List</p>
      <h1 className="page-title">כמעט סיימנו</h1>
      <p className="page-subtitle">
        {profile ? "מצטרפים למרחב המשותף." : "רק עוד שם, ואז מצטרפים."}
      </p>
      <div className="card">
        <AcceptInviteForm needsName={!profile} />
      </div>
    </div>
  );
}
