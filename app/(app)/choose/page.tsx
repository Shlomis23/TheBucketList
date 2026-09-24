import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId } from "@/lib/dal/space";
import { getHome } from "@/lib/dal/home";
import { ChooseForm } from "./ChooseForm";

// בחירה `/choose` — מנוע הבחירה, spec סעיף 5 (F5) ו-8.
// read-only: לא שומר תוכנית בעצמו. "בואו נתכנן את זה" מוביל ל-/plans/new
// עם ה-idea שנבחר (F6, ראו app/(app)/plans/).
export default async function ChoosePage() {
  // userId ו-spaceId לא תלויים זה בזה — במקביל במקום ברצף (ראו app/(app)/page.tsx).
  const [userId, spaceId] = await Promise.all([getVerifiedUserId(), getMySpaceId()]);
  if (!userId) redirect("/login");
  if (!spaceId) redirect("/onboarding");

  const home = await getHome(spaceId, userId);

  return (
    <div className="page">
      <h1 className="page-title">מה עושים?</h1>
      <p className="page-subtitle">
        {home.waitingForPartner
          ? "אתם עוד לא שניים במרחב, אז מאצ'ים לא יעבדו — אבל אפשר כבר לחפש מכל הרעיונות."
          : "נסננן לפי מה שמתחשק לכם, ונציע רעיון אחד בכל פעם."}
      </p>
      <ChooseForm waitingForPartner={home.waitingForPartner} />
    </div>
  );
}
