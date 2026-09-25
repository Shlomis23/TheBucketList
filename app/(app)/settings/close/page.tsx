import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceState } from "@/lib/dal/account";
import { ExportButton } from "@/components/ExportButton";
import { GRACE_DAYS } from "@/lib/validation/account";
import { CloseSpaceForm } from "./CloseSpaceForm";

// סגירת המרחב — הסבר מלא לפני, ZIP, ואישור בהקלדה (החלטות 25.9, 0020).
export default async function CloseSpacePage() {
  const [userId, state] = await Promise.all([getVerifiedUserId(), getMySpaceState()]);
  if (!userId) redirect("/login");
  if (!state) redirect("/onboarding");
  if (state.status === "closed") redirect("/space-closed");

  const withPartner = state.memberCount > 1;

  return (
    <div className="page">
      <Link href="/settings" className="link-plain" style={{ fontSize: 13 }}>
        &rarr; חזרה להגדרות
      </Link>
      <h1 className="page-title" style={{ marginTop: 8 }}>
        סגירת המרחב
      </h1>

      <div className="card" style={{ marginBottom: 12 }}>
        <p className="page-eyebrow" style={{ marginBottom: 8 }}>
          מה יקרה
        </p>
        <ul className="plain-list">
          <li>המרחב ננעל מיד{withPartner ? " — לך ולבן/בת הזוג" : ""}. אי אפשר יהיה לראות או להוסיף רעיונות, תוכניות וזיכרונות.</li>
          {withPartner && <li>בן/בת הזוג יראו מסך &quot;המרחב נסגר&quot;, עם השם שלך והתאריך.</li>}
          <li>
            במשך {GRACE_DAYS} יום אפשר להתחרט: רק את/ה יכולים לבטל את הסגירה, והכול חוזר בדיוק כמו שהיה.
          </li>
          <li>אחרי {GRACE_DAYS} יום הכול נמחק לצמיתות — כולל התמונות. אי אפשר לשחזר.</li>
          <li>
            {withPartner ? "שניכם יכולים" : "אפשר"} להוריד את הזיכרונות כקובץ ZIP עד המחיקה — עכשיו, או ממסך
            הסגירה.
          </li>
          <li>החשבון שלך נשאר. אחרי המחיקה אפשר להתחיל מרחב חדש.</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <p className="page-eyebrow" style={{ marginBottom: 8 }}>
          לפני הכול
        </p>
        <ExportButton />
      </div>

      <div className="card danger-card">
        <CloseSpaceForm />
      </div>
    </div>
  );
}
