import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId } from "@/lib/dal/space";

// בית `/` — spec סעיף 6.
// שלב 1 בלבד: מוודא Auth + מרחב, לא עוד. getHome() אמיתי (תוכנית קרובה,
// מאצ'ים, רעיונות אחרונים, "מה עושים?", הזמנת בן זוג) הוא שלב 2.
export default async function HomePage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const spaceId = await getMySpaceId();
  if (!spaceId) redirect("/onboarding");

  return (
    <div className="page" style={{ paddingTop: "calc(28px + var(--safe-area-top))" }}>
      <p className="page-eyebrow">The Bucket List</p>
      <h1 className="page-title">המרחב שלכם פעיל</h1>
      <p className="page-subtitle">
        מסך הבית האמיתי (תוכנית קרובה, רעיונות אחרונים, &quot;מה עושים?&quot;) יגיע בשלב 2.
      </p>
      <div className="card">
        <p className="status-msg">
          בינתיים — ה-Auth וה-DB עובדים מקצה לקצה. אפשר להתחיל להוסיף רעיונות ברגע שהמסך יהיה מוכן.
        </p>
      </div>
      {/* TODO: הזמנת בן זוג (F1 המשך), getHome(), כפתור "+" -> /ideas/new */}
    </div>
  );
}
