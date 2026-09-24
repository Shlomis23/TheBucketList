import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId } from "@/lib/dal/space";
import { OnboardingForm } from "./OnboardingForm";

// התחלה `/onboarding` — F1, spec סעיף 5, 6.
// TODO: קבלת הזמנה קיימת (מסלול F2) עדיין לא מוצגת כאן — רק יצירת מרחב חדש.
export default async function OnboardingPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const spaceId = await getMySpaceId();
  if (spaceId) redirect("/");

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
