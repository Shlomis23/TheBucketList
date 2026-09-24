import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId, hasPartner } from "@/lib/dal/space";
import { getInvitationStatus } from "@/lib/dal/invitations";
import { getMyProfile } from "@/lib/dal/profile";
import { InvitationPanel } from "./InvitationPanel";
import { DisplayNameForm } from "./DisplayNameForm";
import { signOutAction } from "./actions";

// הגדרות `/settings` — F8, spec סעיף 6, 11.1: השם שלי, ניהול הזמנה, יציאה.
// פרטיות וסגירת מרחב נשארים TODO — סגירה דורשת החלטת מוצר מפורשת (spec
// סעיף 16 #4: צד אחד שסוגר חוסם גם את השני), לא נבנית "אגב".
export default async function SettingsPage() {
  // userId ו-spaceId לא תלויים זה בזה — במקביל במקום ברצף (ראו app/(app)/page.tsx).
  const [userId, spaceId] = await Promise.all([getVerifiedUserId(), getMySpaceId()]);
  if (!userId) redirect("/login");
  if (!spaceId) redirect("/onboarding");

  // getMyProfile משתמש שוב ב-getVerifiedUserId, אבל הוא ב-cache לבקשה —
  // אין קריאת Auth נוספת.
  const [partnerPresent, profile] = await Promise.all([hasPartner(spaceId), getMyProfile()]);

  return (
    <div className="page">
      <h1 className="page-title">הגדרות</h1>

      <section className="card" aria-labelledby="me" style={{ marginTop: 12 }}>
        <p id="me" className="page-eyebrow" style={{ marginBottom: 8 }}>
          השם שלי
        </p>
        <DisplayNameForm initialName={profile?.displayName ?? ""} />
      </section>

      <section id="invite" className="card" style={{ marginTop: 12 }}>
        <p className="page-eyebrow" style={{ marginBottom: 4 }}>
          בן/בת הזוג
        </p>
        {partnerPresent ? (
          <p className="status-msg" style={{ margin: 0 }}>
            כבר הצטרפו אליכם — המרחב מלא.
          </p>
        ) : (
          <InvitationPanel initialStatus={await getInvitationStatus()} />
        )}
      </section>

      <section className="card" aria-labelledby="signout" style={{ marginTop: 12 }}>
        <p id="signout" className="page-eyebrow" style={{ marginBottom: 4 }}>
          יציאה
        </p>
        <p className="status-msg" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
          מתנתק רק במכשיר הזה. כדי לחזור צריך להתחבר שוב עם קישור במייל.
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
    </div>
  );
}
