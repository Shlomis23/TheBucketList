import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getHome } from "@/lib/dal/home";
import { ChooseForm } from "./ChooseForm";
import { PageTransition } from "@/components/PageTransition";

// בחירה `/choose` — מנוע הבחירה, spec סעיף 5 (F5) ו-8.
// read-only: לא שומר תוכנית בעצמו. "בואו נתכנן את זה" מוביל ל-/plans/new
// עם ה-idea שנבחר (F6, ראו app/(app)/plans/).
export default async function ChoosePage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const home = await getHome(userId);
  if (!home) redirect("/onboarding");

  return (
    <PageTransition kind="detail">
      <div className="page">
        <h1 className="page-title">מה עושים?</h1>
        <p className="page-subtitle">
          {home.waitingForPartner
            ? "אתם עוד לא שניים במרחב, אז מאצ'ים לא יעבדו — אבל אפשר כבר לחפש מכל הרעיונות."
            : "נסננן לפי מה שמתחשק לכם, ונציע רעיון אחד בכל פעם."}
        </p>
        <ChooseForm waitingForPartner={home.waitingForPartner} />
      </div>
    </PageTransition>
  );
}
