"use client";

import { useState } from "react";
import { acceptInvitationAction } from "./actions";

// טופס סיום ההצטרפות — לוחצים במפורש (אין ריצה אוטומטית בטעינת הדף, גם
// כאן, מאותה סיבה כמו ה-consent ב-/invite). needsName=true כשעדיין אין
// profile לחשבון הזה (spec 10.3: profile חייב להתקיים לפני הקבלה).
export function AcceptInviteForm({ needsName }: { needsName: boolean }) {
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (status === "busy") return;
    setStatus("busy");
    setErrorMsg("");

    const result = await acceptInvitationAction(needsName ? { displayName } : {});
    // בהצלחה ה-Server Action כבר עשה redirect ל-/ ולא נחזור לכאן.
    if (result && !result.ok) {
      setStatus("error");
      setErrorMsg(result.error.message);
    }
  }

  if (!needsName) {
    return (
      <div className="flex flex-col gap-16">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={status === "busy"}
          onClick={() => submit()}
        >
          {status === "busy" ? "מצטרפים..." : "הצטרפות למרחב המשותף"}
        </button>
        {status === "error" && (
          <p role="alert" className="alert-error">
            {errorMsg}
          </p>
        )}
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-16" onSubmit={submit}>
      <div className="field">
        <label htmlFor="displayName">השם שלי</label>
        <input
          id="displayName"
          required
          maxLength={60}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="input"
        />
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={status === "busy"}>
        {status === "busy" ? "מצטרפים..." : "הצטרפות למרחב המשותף"}
      </button>
      {status === "error" && (
        <p role="alert" className="alert-error">
          {errorMsg}
        </p>
      )}
    </form>
  );
}
