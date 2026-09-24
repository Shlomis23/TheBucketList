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
    <div style={{ padding: 16 }}>
      <h1>The Bucket List</h1>
      <p>המרחב שלכם פעיל. מסך הבית האמיתי (מאצ&apos;ים, רעיונות אחרונים, &quot;מה עושים?&quot;) יגיע בשלב 2.</p>
      {/* TODO: הזמנת בן זוג (F1 המשך), getHome(), כפתור "+" -> /ideas/new */}
    </div>
  );
}
