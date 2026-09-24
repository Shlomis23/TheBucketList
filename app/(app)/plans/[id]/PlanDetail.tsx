"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updatePlanAction,
  confirmPlanAction,
  unconfirmPlanAction,
  cancelPlanAction,
  completePlanAction,
} from "../actions";
import { DEFAULT_PLAN_TIMEZONE, formatBudgetMinor, formatPlanWhen } from "@/lib/validation/plan";
import type { PlanDto } from "@/lib/dal/plans";

type Mode = "view" | "edit" | "complete";

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function todayDateInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// לוח בקרה לתוכנית בודדת — עריכה/אישור/ביטול אישור/ביטול תוכנית/השלמה.
// אחרי כל פעולה מצליחה: router.refresh() כדי לקבל מהשרת את הגרסה העדכנית
// (במקום לתחזק state אופטימי משלנו) — כך "גרסה השתנתה" תמיד מוצג נכון,
// כי אנחנו תמיד רואים את מה ששרת ה-RSC מחזיר, לא ניחוש מקומי (spec סעיף 7).
export function PlanDetail({ plan }: { plan: PlanDto }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("view");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const isProposed = plan.status === "proposed";
  const budget = formatBudgetMinor(plan.budgetMinor);

  function runAction(action: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setErrorMsg("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setErrorMsg(result.error?.message ?? "משהו השתבש, נסו שוב");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <StatusBadge plan={plan} />
      </div>
      <h1 className="page-title">{plan.title}</h1>
      <p className="page-subtitle">
        {formatPlanWhen(plan.startsAt)}
        {plan.meetingPlace ? ` · ${plan.meetingPlace}` : ""}
      </p>

      {mode === "edit" ? (
        <EditPlanForm
          plan={plan}
          onCancel={() => setMode("view")}
          onSaved={() => {
            setMode("view");
            router.refresh();
          }}
        />
      ) : mode === "complete" ? (
        <CompletePlanForm
          plan={plan}
          onCancel={() => setMode("view")}
          onCompleted={() => router.push("/plans")}
        />
      ) : (
        <>
          {(budget || plan.notes) && (
            <div className="card" style={{ marginBottom: 16 }}>
              {budget && (
                <p style={{ margin: "0 0 8px" }}>
                  <span className="page-eyebrow">תקציב</span>
                  <br />
                  {budget}
                </p>
              )}
              {plan.notes && (
                <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{plan.notes}</p>
              )}
            </div>
          )}

          {isProposed && (
            <div className="card" style={{ marginBottom: 16 }}>
              <p className="page-eyebrow" style={{ marginBottom: 8 }}>
                אישורים
              </p>
              {plan.confirmations.length === 0 ? (
                <p className="status-msg" style={{ margin: 0 }}>עדיין אף אחד לא אישר.</p>
              ) : (
                <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                  {plan.confirmations.map((c) => (
                    <li key={c.userId} style={{ fontSize: 14 }}>
                      {c.displayName || "מישהו מכם"} אישר/ה
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {errorMsg && (
            <p role="alert" className="alert-error" style={{ marginBottom: 12 }}>
              {errorMsg}
            </p>
          )}

          {isProposed && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {plan.myConfirmation ? (
                <button
                  type="button"
                  className="btn"
                  style={{ background: "transparent", border: "1.5px solid var(--color-border)" }}
                  disabled={isPending}
                  onClick={() => runAction(() => confirmActionCall("unconfirm", plan))}
                >
                  ביטול האישור שלי
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isPending || !plan.startsAt}
                  onClick={() => runAction(() => confirmActionCall("confirm", plan))}
                  title={!plan.startsAt ? "צריך לקבוע מועד לפני אישור" : undefined}
                >
                  אישור התוכנית
                </button>
              )}
              {!plan.startsAt && !plan.myConfirmation && (
                <p className="status-msg" style={{ margin: 0, fontSize: 12.5 }}>
                  צריך לקבוע מועד כדי לאשר.
                </p>
              )}

              <button
                type="button"
                className="btn"
                style={{ background: "transparent", border: "1.5px solid var(--color-border)" }}
                disabled={isPending}
                onClick={() => setMode("edit")}
              >
                עריכת פרטים
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={isPending}
                onClick={() => setMode("complete")}
              >
                עשינו את זה!
              </button>

              <CancelPlanButton plan={plan} disabled={isPending} onCancel={() => runAction(() => cancelPlanAction({ id: plan.id, expectedVersion: plan.version }))} />
            </div>
          )}
        </>
      )}
    </>
  );
}

function confirmActionCall(kind: "confirm" | "unconfirm", plan: PlanDto) {
  const payload = { id: plan.id, expectedVersion: plan.version };
  return kind === "confirm" ? confirmPlanAction(payload) : unconfirmPlanAction(payload);
}

function StatusBadge({ plan }: { plan: PlanDto }) {
  if (plan.status === "cancelled") return <span className="badge badge-neutral">בוטלה</span>;
  if (plan.status === "completed") return <span className="badge badge-green">בוצע</span>;
  if (plan.isConfirmedByBoth) return <span className="badge badge-green">מאושר לשנינו</span>;
  return <span className="badge badge-yellow">ממתין לאישור</span>;
}

function CancelPlanButton({
  plan,
  disabled,
  onCancel,
}: {
  plan: PlanDto;
  disabled: boolean;
  onCancel: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="link-plain"
        style={{ color: "var(--color-danger, #c0392b)", textAlign: "center" }}
        disabled={disabled}
        onClick={() => setConfirming(true)}
      >
        ביטול התוכנית
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
      <span className="status-msg" style={{ fontSize: 13 }}>לבטל סופית את &quot;{plan.title}&quot;?</span>
      <button type="button" className="link-plain" disabled={disabled} onClick={onCancel}>
        כן, לבטל
      </button>
      <button type="button" className="link-plain" disabled={disabled} onClick={() => setConfirming(false)}>
        לא
      </button>
    </div>
  );
}

function EditPlanForm({
  plan,
  onCancel,
  onSaved,
}: {
  plan: PlanDto;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [startsAtLocal, setStartsAtLocal] = useState(isoToLocalInput(plan.startsAt));
  const [endsAtLocal, setEndsAtLocal] = useState(isoToLocalInput(plan.endsAt));
  const [meetingPlace, setMeetingPlace] = useState(plan.meetingPlace ?? "");
  const [notes, setNotes] = useState(plan.notes);
  const [budgetShekels, setBudgetShekels] = useState(
    plan.budgetMinor !== null ? String(plan.budgetMinor / 100) : "",
  );
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "busy") return;
    setStatus("busy");
    setErrorMsg("");

    const budgetMinor = budgetShekels.trim() === "" ? undefined : Math.round(Number(budgetShekels) * 100);

    const result = await updatePlanAction({
      id: plan.id,
      expectedVersion: plan.version,
      startsAt: startsAtLocal ? new Date(startsAtLocal).toISOString() : undefined,
      endsAt: endsAtLocal ? new Date(endsAtLocal).toISOString() : undefined,
      timezone: DEFAULT_PLAN_TIMEZONE,
      meetingPlace: meetingPlace.trim() === "" ? undefined : meetingPlace,
      notes,
      budgetMinor: budgetMinor !== undefined && !Number.isNaN(budgetMinor) ? budgetMinor : undefined,
    });

    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error.message);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="editStartsAt">מתי</label>
          <input
            id="editStartsAt"
            type="datetime-local"
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
            className="input"
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="editEndsAt">עד</label>
          <input
            id="editEndsAt"
            type="datetime-local"
            value={endsAtLocal}
            onChange={(e) => setEndsAtLocal(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="editMeetingPlace">מקום מפגש</label>
        <input
          id="editMeetingPlace"
          maxLength={200}
          value={meetingPlace}
          onChange={(e) => setMeetingPlace(e.target.value)}
          className="input"
        />
      </div>

      <div className="field">
        <label htmlFor="editNotes">הערות</label>
        <textarea
          id="editNotes"
          maxLength={3000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="textarea"
        />
      </div>

      <div className="field">
        <label htmlFor="editBudget">תקציב משוער (₪)</label>
        <input
          id="editBudget"
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
          {status === "busy" ? "שומר..." : "שמירת שינויים"}
        </button>
        <button
          type="button"
          className="btn"
          style={{ background: "transparent", border: "1.5px solid var(--color-border)" }}
          onClick={onCancel}
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

function CompletePlanForm({
  plan,
  onCancel,
  onCompleted,
}: {
  plan: PlanDto;
  onCancel: () => void;
  onCompleted: () => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [happenedOn, setHappenedOn] = useState(todayDateInput());
  const [story, setStory] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "busy") return;
    setStatus("busy");
    setErrorMsg("");

    const result = await completePlanAction({
      requestId,
      id: plan.id,
      expectedVersion: plan.version,
      happenedOn,
      story,
    });

    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error.message);
      return;
    }
    onCompleted();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: 0, fontWeight: 700 }}>איזה כיף — ספרו לנו על זה</p>
      <div className="field">
        <label htmlFor="happenedOn">מתי זה קרה</label>
        <input
          id="happenedOn"
          type="date"
          required
          value={happenedOn}
          onChange={(e) => setHappenedOn(e.target.value)}
          className="input"
        />
      </div>
      <div className="field">
        <label htmlFor="story">איך היה (אופציונלי)</label>
        <textarea
          id="story"
          maxLength={5000}
          value={story}
          onChange={(e) => setStory(e.target.value)}
          className="textarea"
        />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary btn-block" disabled={status === "busy"}>
          {status === "busy" ? "שומר..." : "שמירה לארכיון הזיכרונות"}
        </button>
        <button
          type="button"
          className="btn"
          style={{ background: "transparent", border: "1.5px solid var(--color-border)" }}
          onClick={onCancel}
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
