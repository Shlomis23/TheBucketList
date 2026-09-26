import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceState } from "@/lib/dal/account";
import { ExportButton } from "@/components/ExportButton";
import { signOutAction } from "@/app/(app)/settings/actions";
import { daysLeft, formatPurgeDate } from "@/lib/validation/account";
import { ReopenButton } from "./ReopenButton";

// מרחב סגור `/space-closed` — F8 (0020): מי סגר ומתי, מתי הכול יימחק,
// הורדת ZIP לשני הצדדים, ביטול הסגירה (רק למי שסגר), מחיקת חשבון, יציאה.
// אין כאן שום תוכן זוגי — רק מצב הסגירה.
export default async function SpaceClosedPage() {
  const [userId, state] = await Promise.all([getVerifiedUserId(), getMySpaceState()]);
  if (!userId) redirect("/login");
  if (!state) redirect("/onboarding");
  if (state.status === "open") redirect("/");

  const purgeAfter = state.purgeAfter!;
  const left = daysLeft(purgeAfter);
  const who = state.closedByMe ? "סגרת את המרחב" : state.closedByName ? `המרחב נסגר על ידי ${state.closedByName}` : "המרחב נסגר על ידי בן/בת הזוג";

  return (
    <div className="page" style={{ paddingTop: "calc(40px + var(--safe-area-top))" }}>
      <p className="page-eyebrow">The Bucket List</p>
      <h1 className="page-title">המרחב נסגר</h1>
      <p className="page-subtitle">
        {who}
        {state.closedAt ? ` ב-${new Date(state.closedAt).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" })}` : ""}.
      </p>

      <div className="card" style={{ marginBottom: 12 }}>
        <p className="page-eyebrow" style={{ marginBottom: 8 }}>
          מחיקה סופית
        </p>
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>
          {left > 0 ? `בעוד ${left === 1 ? "יום אחד" : `${left} ימים`} · ` : "היום · "}
          {formatPurgeDate(purgeAfter)}
        </p>
        <p className="status-msg" style={{ margin: "8px 0 0", fontSize: 13.5 }}>
          אז יימחקו לצמיתות כל הרעיונות, התוכניות, הזיכרונות והתמונות.
          {state.deletionRequested && " באותו יום יימחק גם החשבון שלך."}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <p className="page-eyebrow" style={{ marginBottom: 8 }}>
          הזיכרונות שלכם
        </p>
        <p className="status-msg" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
          אפשר להוריד עותק עד המחיקה: כל הזיכרונות, התמונות והרעיונות, בקובץ ZIP אחד.
        </p>
        <ExportButton />
      </div>

      {state.closedByMe && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="page-eyebrow" style={{ marginBottom: 8 }}>
            התחרטת?
          </p>
          <p className="status-msg" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
            עד המחיקה אפשר לבטל את הסגירה, והכול חוזר בדיוק כמו שהיה — לשניכם.
          </p>
          <ReopenButton />
        </div>
      )}

      <div className="card">
        {!state.deletionRequested && (
          <p className="status-msg" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
            החשבון שלך נשאר גם אחרי המחיקה, ואפשר יהיה להתחיל מרחב חדש.{" "}
            <Link href="/account/delete" className="link-plain" style={{ fontSize: 13.5 }}>
              למחוק גם את החשבון
            </Link>
          </p>
        )}
        <form action={signOutAction}>
          <button
            type="submit"
            className="btn btn-block"
            style={{ background: "transparent", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
          >
            התנתקות
          </button>
        </form>
      </div>
    </div>
  );
}
