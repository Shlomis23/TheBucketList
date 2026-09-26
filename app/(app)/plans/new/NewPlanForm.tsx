"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlanAction } from "../actions";
import { DEFAULT_PLAN_TIMEZONE } from "@/lib/validation/plan";
import { DateTimeRangeFields, endPartsToIso, partsToIso, type DateTimeParts } from "@/components/DateTimeRangeFields";

// טופס תכנון — spec סעיף 6.1: מועד/שעה אופציונליים לשלב הצעה, מקום מפגש
// עד 200, הערות עד 3,000, תקציב אופציונלי. תאריך+שעה (DateTimeRangeFields)
// מומרים ל-ISO מלא (UTC) לפני השליחה — בדיקת isoDateTime ב-lib/validation/plan.ts.
export function NewPlanForm({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const [requestId] = useState(() => crypto.randomUUID());
  const [start, setStart] = useState<DateTimeParts>({ date: "", time: "" });
  const [end, setEnd] = useState<DateTimeParts>({ date: "", time: "" });
  const [meetingPlace, setMeetingPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [budgetShekels, setBudgetShekels] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "busy") return;
    setErrorMsg("");
    setFieldErrors({});

    const startIso = partsToIso(start);
    const endIso = endPartsToIso(start, end);
    if (startIso.error || endIso.error) {
      setFieldErrors({
        ...(startIso.error ? { startsAt: [startIso.error] } : {}),
        ...(endIso.error ? { endsAt: [endIso.error] } : {}),
      });
      return;
    }
    setStatus("busy");

    const budgetMinor =
      budgetShekels.trim() === "" ? undefined : Math.round(Number(budgetShekels) * 100);

    const result = await createPlanAction({
      requestId,
      ideaId,
      startsAt: startIso.iso,
      endsAt: endIso.iso,
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
    <form className="flex flex-col gap-16" onSubmit={handleSubmit}>
      <DateTimeRangeFields
        idPrefix="plan"
        start={start}
        end={end}
        onStartChange={setStart}
        onEndChange={setEnd}
        startLabel="מתי (אופציונלי)"
        endLabel="עד (אופציונלי)"
        startError={fieldErrors.startsAt?.[0]}
        endError={fieldErrors.endsAt?.[0]}
      />

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

      <div className="flex gap-12">
        <button type="submit" className="btn btn-primary btn-block" disabled={status === "busy"}>
          {status === "busy" ? "שומר..." : "שמירת תוכנית"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
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
