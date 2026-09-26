import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceState } from "@/lib/dal/account";
import { getPartnerName } from "@/lib/dal/profile";
import { ExportButton } from "@/components/ExportButton";
import { GRACE_DAYS, formatPurgeDate } from "@/lib/validation/account";
import { DeleteAccountForm } from "./DeleteAccountForm";

// מחיקת חשבון — מחוץ לקבוצת (app) (בלי ניווט תחתון), כי מגיעים אליה גם
// ממסך "המרחב נסגר". ההסבר משתנה לפי המצב — ראו deleteAccount ב-lib/dal/account.ts.
export default async function DeleteAccountPage() {
  const [userId, state, partnerName] = await Promise.all([getVerifiedUserId(), getMySpaceState(), getPartnerName()]);
  if (!userId) redirect("/login");
  if (state?.status === "closed" && state.deletionRequested) redirect("/space-closed");

  const mode = !state
    ? "no-space"
    : state.status === "closed"
      ? "closed"
      : state.memberCount > 1
        ? "with-partner"
        : "alone";
  const back = !state ? "/onboarding" : state.status === "closed" ? "/space-closed" : "/settings";

  return (
    <div className="page" style={{ paddingTop: "calc(24px + var(--safe-area-top))" }}>
      <Link href={back} className="link-plain" style={{ fontSize: 13.5 }}>
        &rarr; חזרה
      </Link>
      <h1 className="page-title" style={{ marginTop: 8 }}>
        מחיקת החשבון
      </h1>

      <div className="card" style={{ marginBottom: 12 }}>
        <p className="page-eyebrow" style={{ marginBottom: 8 }}>
          מה יקרה
        </p>
        <ul className="plain-list">
          {mode === "with-partner" && (
            <>
              <li>המרחב המשותף נסגר מיד — גם ל{partnerName ?? "בן/בת הזוג"}.</li>
              <li>
                במשך {GRACE_DAYS} יום אפשר להתחרט (מתחברים ומבטלים את הסגירה). אחר כך החשבון והמרחב נמחקים
                לצמיתות, כולל התמונות.
              </li>
              <li>
                {partnerName
                  ? `ל${partnerName} תהיה אפשרות להוריד את הזיכרונות עד המחיקה, והחשבון של ${partnerName} נשאר.`
                  : "בן/בת הזוג יכולים להוריד את הזיכרונות עד המחיקה, והחשבון שלהם נשאר."}
              </li>
            </>
          )}
          {mode === "alone" && (
            <>
              <li>אין עדיין בן/בת זוג במרחב, אז אין תקופת המתנה: החשבון, המרחב וכל מה שבו נמחקים מיד.</li>
              <li>אי אפשר לשחזר.</li>
            </>
          )}
          {mode === "closed" && state?.purgeAfter && (
            <>
              <li>המרחב כבר סגור, ויימחק ב{formatPurgeDate(state.purgeAfter)}.</li>
              <li>באותו יום יימחק גם החשבון שלך. עד אז אפשר עדיין להוריד את הזיכרונות.</li>
            </>
          )}
          {mode === "no-space" && <li>אין לך מרחב פעיל, אז החשבון נמחק מיד. אי אפשר לשחזר.</li>}
        </ul>
      </div>

      {mode !== "no-space" && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="page-eyebrow" style={{ marginBottom: 8 }}>
            לפני הכול
          </p>
          <ExportButton />
        </div>
      )}

      <div className="card danger-card">
        <DeleteAccountForm immediate={mode === "alone" || mode === "no-space"} />
      </div>
    </div>
  );
}
