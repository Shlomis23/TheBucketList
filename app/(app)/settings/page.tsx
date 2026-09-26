import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId, hasPartner } from "@/lib/dal/space";
import { getInvitationStatus } from "@/lib/dal/invitations";
import { getMyProfile, getPartnerName } from "@/lib/dal/profile";
import { InvitationPanel } from "./InvitationPanel";
import { DisplayNameForm } from "./DisplayNameForm";
import { signOutAction } from "./actions";
import Link from "next/link";
import { ExportButton } from "@/components/ExportButton";
import { PushSettings } from "@/components/PushSettings";

// הגדרות `/settings` — F8, spec סעיף 6, 11.1: השם שלי, ניהול הזמנה, הורדת
// הזיכרונות, יציאה, ובתחתית — סגירת מרחב ומחיקת חשבון (החלטות 25.9, 0020).
export default async function SettingsPage() {
  // userId ו-spaceId לא תלויים זה בזה — במקביל במקום ברצף (ראו app/(app)/page.tsx).
  const [userId, spaceId] = await Promise.all([getVerifiedUserId(), getMySpaceId()]);
  if (!userId) redirect("/login");
  if (!spaceId) redirect("/onboarding");

  // getMyProfile משתמש שוב ב-getVerifiedUserId, אבל הוא ב-cache לבקשה —
  // אין קריאת Auth נוספת.
  const [partnerPresent, profile, partnerName] = await Promise.all([hasPartner(spaceId), getMyProfile(), getPartnerName()]);

  return (
    <div className="page">
      <h1 className="page-title">הגדרות</h1>

      <section className="card" aria-labelledby="me" style={{ marginTop: 12 }}>
        <p id="me" className="page-eyebrow" style={{ marginBottom: 8 }}>
          השם שלי
        </p>
        <DisplayNameForm initialName={profile?.displayName ?? ""} partnerName={partnerName} />
      </section>

      <section id="invite" className="card" style={{ marginTop: 12 }}>
        <p className="page-eyebrow" style={{ marginBottom: 4 }}>
          {partnerPresent && partnerName ? partnerName : "בן/בת הזוג"}
        </p>
        {partnerPresent ? (
          <p className="status-msg" style={{ margin: 0 }}>
            {partnerName ? "במרחב איתך — המרחב מלא." : "כבר הצטרפו אליכם — המרחב מלא."}
          </p>
        ) : (
          <InvitationPanel initialStatus={await getInvitationStatus()} />
        )}
      </section>

      <section className="card" aria-labelledby="notifications" style={{ marginTop: 12 }}>
        <p id="notifications" className="page-eyebrow" style={{ marginBottom: 8 }}>
          התראות
        </p>
        <PushSettings publicKey={process.env.VAPID_PUBLIC_KEY ?? null} partnerName={partnerName} />
      </section>

      <section className="card" aria-labelledby="export" style={{ marginTop: 12 }}>
        <p id="export" className="page-eyebrow" style={{ marginBottom: 4 }}>
          גיבוי
        </p>
        <p className="status-msg" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
          כל הזיכרונות, התמונות והרעיונות בקובץ ZIP אחד — עם דף שנפתח בכל דפדפן.
        </p>
        <ExportButton />
      </section>

      <section className="card" aria-labelledby="signout" style={{ marginTop: 12 }}>
        <p id="signout" className="page-eyebrow" style={{ marginBottom: 4 }}>
          יציאה
        </p>
        <p className="status-msg" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
          מתנתק רק במכשיר הזה. כדי לחזור צריך להתחבר שוב עם קוד במייל.
        </p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="btn btn-block"
            style={{ background: "transparent", border: "1.5px solid var(--color-border)", color: "var(--color-danger)" }}
          >
            התנתקות
          </button>
        </form>
      </section>

      {/* אזור רגיש — בנפרד, בתחתית, וכל פעולה במסך הסבר משלה. */}
      <section className="card danger-card" aria-labelledby="danger" style={{ marginTop: 24 }}>
        <p id="danger" className="page-eyebrow" style={{ marginBottom: 12, color: "var(--color-danger)" }}>
          אזור רגיש
        </p>
        <Link href="/settings/close" className="danger-link">
          <span>סגירת המרחב</span>
          <span className="status-msg" style={{ fontSize: 12.5, margin: 0 }}>
            נועל לשניכם ונמחק אחרי 14 יום. אפשר להתחרט עד אז.
          </span>
        </Link>
        <Link href="/account/delete" className="danger-link">
          <span>מחיקת החשבון</span>
          <span className="status-msg" style={{ fontSize: 12.5, margin: 0 }}>
            {partnerPresent ? "סוגר גם את המרחב המשותף." : "מוחק את החשבון ואת המרחב מיד."}
          </span>
        </Link>
      </section>
    </div>
  );
}
