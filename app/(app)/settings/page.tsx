import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId, hasPartner } from "@/lib/dal/space";
import { getInvitationStatus } from "@/lib/dal/invitations";
import { InvitationPanel } from "./InvitationPanel";

// הגדרות `/settings` — F8, spec סעיף 6, 11.1.
// בסלייס הזה: ניהול הזמנה בלבד (F1/F2 — "בוא נעבוד על הפונקציה של הוספת
// בן זוג"). שם שלי/בן זוג, פרטיות, יציאה וסגירת מרחב נשארים TODO להמשך —
// לא נבנים "אגב" בלי בקשה מפורשת.
export default async function SettingsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const spaceId = await getMySpaceId();
  if (!spaceId) redirect("/onboarding");

  const partnerPresent = await hasPartner(spaceId);

  return (
    <div className="page">
      <h1 className="page-title">הגדרות</h1>

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
    </div>
  );
}
