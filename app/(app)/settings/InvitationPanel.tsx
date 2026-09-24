"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvitationAction, revokeInvitationAction } from "./actions";
import type { InvitationStatusDto } from "@/lib/dal/invitations";
import { maskedStatusLabel } from "@/lib/validation/invitation";

type FreshLink = { id: string; link: string; expiresAt: string; maskedEmail: string };

const noSubscription = () => () => {};
const getShareSupport = () => "share" in navigator;
const getServerShareSupport = () => false;

function formatExpiry(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ניהול הזמנה — F1/F2, spec סעיף 6, 11.1, 13.2, 13.3.
// הקישור הגולמי מוצג רק פעם אחת, מיד אחרי היצירה (freshLink, בזיכרון הדפדפן
// בלבד) — אחרי רענון/חזרה למסך יש רק סטטוס מוסך (getInvitationStatus, אף
// פעם לא את הקישור עצמו). שיתוף: העתקה תמיד; Web Share כשקיים במכשיר.
export function InvitationPanel({ initialStatus }: { initialStatus: InvitationStatusDto | null }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [freshLink, setFreshLink] = useState<FreshLink | null>(null);
  const [email, setEmail] = useState("");
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  // useSyncExternalStore ולא useState+useEffect: getServerSnapshot=false
  // תואם את ה-HTML שהשרת רינדר (אין navigator בשרת), כך שאין hydration
  // mismatch, וגם אין setState בתוך effect (share support לא באמת "משתנה"
  // אחרי mount, אז אין גם צורך אמיתי ב-subscription).
  const showShareButton = useSyncExternalStore(noSubscription, getShareSupport, getServerShareSupport);

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setCopied(false);
    startTransition(async () => {
      const result = await createInvitationAction({ targetEmail: email });
      if (!result.ok) {
        setErrorMsg(result.error.message);
        return;
      }
      setFreshLink(result.data);
      setStatus({
        id: result.data.id,
        maskedEmail: result.data.maskedEmail,
        status: "pending",
        expiresAt: result.data.expiresAt,
        createdAt: new Date().toISOString(),
      });
      setEmail("");
      setConfirmingRevoke(false);
      router.refresh();
    });
  }

  function runRevoke() {
    if (!status) return;
    setErrorMsg("");
    startTransition(async () => {
      const result = await revokeInvitationAction({ invitationId: status.id });
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setConfirmingRevoke(false);
        return;
      }
      setStatus(null);
      setFreshLink(null);
      setConfirmingRevoke(false);
      router.refresh();
    });
  }

  async function copyLink() {
    if (!freshLink) return;
    try {
      await navigator.clipboard.writeText(freshLink.link);
      setCopied(true);
    } catch {
      setErrorMsg("ההעתקה נכשלה — אפשר לסמן ולהעתיק ידנית.");
    }
  }

  async function shareLink() {
    if (!freshLink) return;
    try {
      await navigator.share({
        title: "הזמנה ל-The Bucket List",
        text: "הצטרפו אליי ל-The Bucket List — הרשימה המשותפת שלנו.",
        url: freshLink.link,
      });
    } catch {
      // המשתמש ביטל את השיתוף, או שאין תמיכה — לא שגיאה אמיתית.
    }
  }

  // עדיין לא הונפקה הזמנה, או שהאחרונה בוטלה — טופס יצירה.
  if (!status || status.status === "revoked") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p className="status-msg" style={{ margin: 0 }}>
          מזמינים את בן/בת הזוג להצטרף למרחב המשותף. הקישור תקף ל-48 שעות.
        </p>
        <form onSubmit={submitCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label htmlFor="targetEmail">האימייל של בן/בת הזוג</label>
            <input
              id="targetEmail"
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
            {pending ? "יוצר קישור..." : "יצירת קישור הזמנה"}
          </button>
        </form>
        {errorMsg && (
          <p role="alert" className="alert-error">
            {errorMsg}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p className="status-msg" style={{ margin: 0 }}>
        הזמנה ל-{status.maskedEmail} — {maskedStatusLabel(status.status)}
        {status.status === "pending" && ` · בתוקף עד ${formatExpiry(status.expiresAt)}`}
      </p>

      {freshLink && (
        <div className="card" style={{ background: "var(--color-primary-soft)", padding: 14 }}>
          <p className="status-msg" style={{ margin: "0 0 10px", fontSize: 13 }}>
            הקישור מוצג רק עכשיו — לא נשמור אותו כדי להראות שוב. אפשר להעתיק או לשתף עכשיו.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={copyLink}>
              {copied ? "הועתק ✓" : "העתקת קישור"}
            </button>
            {showShareButton && (
              <button
                type="button"
                className="btn"
                style={{ flex: 1, background: "transparent", border: "1.5px solid var(--color-border)" }}
                onClick={shareLink}
              >
                שיתוף
              </button>
            )}
          </div>
        </div>
      )}

      {status.status === "pending" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {!confirmingRevoke ? (
            <button
              type="button"
              className="link-plain"
              style={{ textAlign: "center" }}
              disabled={pending}
              onClick={() => setConfirmingRevoke(true)}
            >
              ביטול ההזמנה
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
              <span className="status-msg" style={{ fontSize: 13 }}>לבטל את ההזמנה?</span>
              <button type="button" className="link-plain" disabled={pending} onClick={runRevoke}>
                כן
              </button>
              <button type="button" className="link-plain" disabled={pending} onClick={() => setConfirmingRevoke(false)}>
                לא
              </button>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <p role="alert" className="alert-error">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
