"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlanAction } from "../actions";
import { DEFAULT_PLAN_TIMEZONE } from "@/lib/validation/plan";

// טופס תכנון — spec סעיף 6.1: מועד/שעה אופציונליים לשלב הצעה, מקום מפגש
// עד 200, הערות עד 3,000, תקציב אופציונלי. datetime-local מומר ל-ISO מלא
// (UTC) לפני השליחה כדי לעבור את בדיקת isoDateTime ב-lib/validation/plan.ts.
export function NewPlanForm({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const [requestId] = useState(() => crypto.randomUUID());
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [meetingPlace, setMeetingPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [budgetShekels, setBudgetShekels] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "busy") return;
    setStatus("busy");
    setErrorMsg("");
    setFieldErrors({});

    const budgetMinor =
      budgetShekels.trim() === "" ? undefined : Math.round(Number(budgetShekels) * 100);

    const result = await createPlanAction({
      requestId,
      ideaId,
      startsAt: startsAtLocal ? new Date(startsAtLocal).toISOString() : undefined,
      endsAt: endsAtLocal ? new Date(endsAtLocal).toISOString() : undefined,
      timezone: DEFAULT_PLAN_TIMEZONE,
      meetingPlace: meetingPlace.trim() === "" ? undefined : meetingPlace,
      notes,
      budgetMinor: budgetMinor !== undefined && !Number.isNaN(budgetMinor) ? budgetMinor : undefined,
    });

    // בהצלחה ה-Server Action כבר עשה redirect ל-/plans/[id] ולא נחזור לכאן.
    if (result && !result.ok) {
      setStatus("error");
      setErrorMsg(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="startsAt">מתי (אופציונלי)</label>
          <input
            id="startsAt"
            type="datetime-local"
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
            className="input"
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="endsAt">עד (אופציונלי)</label>
          <input
            id="endsAt"
            type="datetime-local"
            value={endsAtLocal}
            onChange={(e) => setEndsAtLocal(e.target.value)}
            className="input"
          />
        </div>
      </div>
      {fieldErrors.endsAt && (
        <p role="alert" className="alert-error">
          {fieldErrors.endsAt[0]}
        </p>
      )}

      <div className="field">
        <label htmlFor="meetingPlace">מקום מפגש</label>
        <input
          id="meetingPlace"
          maxLength={200}
          value={meetingPlace}
          onChange={(e) => setMeetingPlace(e.target.value)}
          className="input"
        />
      </div>

      <div className="field">
        <label htmlFor="notes">הערות</label>
        <textarea
          id="notes"
          maxLength={3000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="textarea"
        />
      </div>

      <div className="field">
        <label htmlFor="budget">תקציב משוער (₪)</label>
        <input
          id="budget"
          type="number"
          min={0}
          inputMode="decimal"
          value={budgetShekels}
          onChange={(e) => setBudgetShekels(e.target.value)}
          className="input"
        />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary btn-block" disabled={status === "busy"}>
          {status === "busy" ? "שומר..." : "שמירת תוכנית"}
        </button>
        <button
          type="button"
          className="btn"
          style={{ background: "transparent", border: "1.5px solid var(--color-border)" }}
          onClick={() => router.back()}
          disabled={status === "busy"}
        >
          ביטול
        </button>
      </div>
      {status === "error" && (
        <p role="alert" className="alert-error">
          {errorMsg}
        </p>
      )}
    </form>
  );
}
