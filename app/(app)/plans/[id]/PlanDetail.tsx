"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updatePlanAction,
  cancelPlanAction,
  completePlanAction,
  postponePlanWeekAction,
} from "../actions";
import { DEFAULT_PLAN_TIMEZONE, formatBudgetMinor, formatPlanWhen, isPlanPast, pastWhenLabel } from "@/lib/validation/plan";
import { CoverImg } from "@/components/CoverImg";
import { BackButton } from "@/components/BackButton";
import { AddToCalendar } from "@/components/AddToCalendar";
import { showToast } from "@/components/UndoToast";
import { DateTimeRangeFields, endPartsToIso, isoToParts, partsToIso, type DateTimeParts } from "@/components/DateTimeRangeFields";
import type { PlanDetailDto, PlanDto } from "@/lib/dal/plans";
import { FromIdeaCard } from "@/components/FromIdeaCard";

type Mode = "view" | "edit" | "complete";

function todayDateInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// לוח בקרה לתוכנית בודדת — השלמה/עריכה/ביטול. אין שלב "אישור" (שלומי, 25.9:
// תוכנית נפתחת אחרי שכבר דיברנו עליה); בן/בת הזוג מקבלים התראה על יצירה/עדכון.
// אחרי כל פעולה מצליחה: router.refresh() כדי לקבל מהשרת את הגרסה העדכנית
// (במקום לתחזק state אופטימי משלנו) — כך "גרסה השתנתה" תמיד מוצג נכון,
// כי אנחנו תמיד רואים את מה ששרת ה-RSC מחזיר, לא ניחוש מקומי (spec סעיף 7).
// memoryId — רק לתוכנית שהושלמה (ראו getMemoryIdForPlan), לכפתור "לזיכרון".
export function PlanDetail({
  plan,
  memoryId,
  startCompleting = false,
}: {
  plan: PlanDetailDto;
  memoryId: string | null;
  startCompleting?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(startCompleting ? "complete" : "view");
  const past = plan.status === "proposed" && isPlanPast(plan.startsAt, plan.endsAt);
  // "לדחות בשבוע (יום שבת, 10 באוק׳, 19:30)" — אותה שעה, 7 ימים אחרי.
  const weekLater = plan.startsAt ? formatPlanWhen(new Date(new Date(plan.startsAt).getTime() + 7 * 86_400_000).toISOString()) : null;
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const isProposed = plan.status === "proposed";
  const budget = formatBudgetMinor(plan.budgetMinor);

  function runAction(action: () => Promise<{ ok: boolean; error?: { message: string } }>, onDone?: () => void) {
    setErrorMsg("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setErrorMsg(result.error?.message ?? "משהו השתבש, נסו שוב");
        return;
      }
      if (onDone) onDone();
      else router.refresh();
    });
  }

  return (
    <>
      {plan.ideaCategory ? (
        <div className="hero-wrap">
          <CoverImg category={plan.ideaCategory} className="hero-banner" />
          <BackButton fallback="/plans" />
        </div>
      ) : (
        <BackButton fallback="/plans" className="hero-back is-inline" />
      )}
      <div className="flex gap-8 items-center mb-8">
        <StatusBadge plan={plan} />
      </div>
      <h1 className="page-title">{plan.title}</h1>
      <p className="page-subtitle">
        {formatPlanWhen(plan.startsAt)}
        {plan.meetingPlace ? ` · ${plan.meetingPlace}` : ""}
      </p>
      {/* הוספה ליומן (26.9) — רק לתוכנית עתידית עם מועד. */}
      {mode === "view" && plan.status === "proposed" && plan.startsAt && !past && (
        <div className="mb-16">
          <AddToCalendar
            plan={{ ...plan, startsAt: plan.startsAt }}
          />
        </div>
      )}

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
          onCompleted={(newMemoryId) => router.push(`/memories/${newMemoryId}`)}
        />
      ) : (
        <>
          {past && (
            <div className="card mb-16 bg-soft" style={{ borderColor: "transparent" }}>
              <p className="m-0 mb-4 fw-800 c-primary">המועד עבר — איך היה?</p>
              <p className="status-msg m-0 mb-12 text-sm">
                {plan.startsAt ? `זה היה ${pastWhenLabel(plan.startsAt)}. ` : ""}עשיתם את זה? שומרים כזיכרון. לא יצא? אפשר
                לדחות או לבטל.
              </p>
              <div className="flex flex-col gap-8">
                <button type="button" className="btn btn-primary btn-block" disabled={isPending} onClick={() => setMode("complete")}>
                  עשינו את זה! לשמור כזיכרון
                </button>
                {weekLater && (
                  <button
                    type="button"
                    className="btn btn-block bg-surface c-primary"
                    disabled={isPending}
                    onClick={() => runAction(() => postponePlanWeekAction({ id: plan.id, expectedVersion: plan.version }))}
                  >
                    <span className="flex flex-col leading-tight">
                      <span>לא יצא — לדחות בשבוע</span>
                      <span className="text-xs fw-600 c-muted">ל{weekLater}</span>
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-block btn-outline"
                  disabled={isPending}
                  onClick={() => setMode("edit")}
                >
                  לקבוע מועד אחר
                </button>
              </div>
            </div>
          )}

          <FromIdeaCard
            ideaId={plan.ideaId}
            sourceUrl={plan.ideaSourceUrl}
            locationText={plan.ideaLocationText}
            placeId={plan.ideaPlaceId}
            conversationLinks={plan.conversationLinks}
          />

          {(budget || plan.notes) && (
            <div className="card mb-16">
              {budget && (
                <p className="m-0 mb-8">
                  <span className="page-eyebrow">תקציב</span>
                  <br />
                  {budget}
                </p>
              )}
              {plan.notes && (
                <p className="m-0 pre-wrap leading-relaxed">{plan.notes}</p>
              )}
            </div>
          )}

          {errorMsg && (
            <p role="alert" className="alert-error mb-12">
              {errorMsg}
            </p>
          )}

          {memoryId && (
            <Link transitionTypes={["nav-forward"]} href={`/memories/${memoryId}`} className="btn btn-primary btn-block mb-12">
              לזיכרון &larr;
            </Link>
          )}

          {isProposed && (
            <div className="flex flex-col gap-12">
              {/* כשהמועד עבר, הכפתור הזה כבר בבאנר "איך היה?" למעלה. */}
              {!past && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isPending}
                  onClick={() => setMode("complete")}
                >
                  עשינו את זה!
                </button>
              )}

              {/* כשהמועד עבר — "לקבוע מועד אחר" בבאנר פותח את אותו טופס עריכה. */}
              {!past && (
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={isPending}
                  onClick={() => setMode("edit")}
                >
                  עריכת פרטים
                </button>
              )}

              <CancelPlanButton plan={plan} disabled={isPending} onCancel={() => {
                  // "ביטול" ל-5 שניות (26.9): חוזרים לתוכניות, התוכנית מוסתרת, ורק
                  // אחרי זה הביטול בשרת (וההתראה לבן/בת הזוג). UndoToast.
                  showToast({
                    message: `"${plan.title}" בוטלה`,
                    hideSelector: `[data-plan-id="${plan.id}"]`,
                    onCommit: () => cancelPlanAction({ id: plan.id, expectedVersion: plan.version }),
                    failMessage: "התוכנית לא בוטלה",
                  });
                  router.replace("/plans");
                }} />
            </div>
          )}
        </>
      )}
    </>
  );
}

function StatusBadge({ plan }: { plan: PlanDto }) {
  if (plan.status === "cancelled") return <span className="badge badge-neutral">בוטלה</span>;
  if (plan.status === "completed") return <span className="badge badge-green">בוצע</span>;
  // בלי שלב אישור (25.9): תוכנית שנוצרה = סגורה. מסמנים רק מה שחסר.
  if (!plan.startsAt) return <span className="badge badge-yellow">מועד לא נקבע</span>;
  return null;
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
        className="link-plain text-center c-danger"
        disabled={disabled}
        onClick={() => setConfirming(true)}
      >
        ביטול התוכנית
      </button>
    );
  }

  return (
    <div className="flex gap-8 items-center justify-center">
      <span className="status-msg text-sm">לבטל סופית את &quot;{plan.title}&quot;?</span>
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
  const [start, setStart] = useState<DateTimeParts>(() => isoToParts(plan.startsAt));
  const [end, setEnd] = useState<DateTimeParts>(() => isoToParts(plan.endsAt));
  const [dateErrors, setDateErrors] = useState<{ start?: string; end?: string }>({});
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
    setErrorMsg("");

    const startIso = partsToIso(start);
    const endIso = endPartsToIso(start, end);
    setDateErrors({ start: startIso.error, end: endIso.error });
    if (startIso.error || endIso.error) return;
    setStatus("busy");

    const budgetMinor = budgetShekels.trim() === "" ? undefined : Math.round(Number(budgetShekels) * 100);

    const result = await updatePlanAction({
      id: plan.id,
      expectedVersion: plan.version,
      startsAt: startIso.iso,
      endsAt: endIso.iso,
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
    <form onSubmit={handleSubmit} className="card flex flex-col gap-16">
      <DateTimeRangeFields
        idPrefix="edit-plan"
        start={start}
        end={end}
        onStartChange={setStart}
        onEndChange={setEnd}
        startError={dateErrors.start}
        endError={dateErrors.end}
      />

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

      <div className="flex gap-12">
        <button type="submit" className="btn btn-primary btn-block" disabled={status === "busy"}>
          {status === "busy" ? "שומר..." : "שמירת שינויים"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
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
  onCompleted: (memoryId: string) => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [happenedOn, setHappenedOn] = useState(todayDateInput());
  const [story, setStory] = useState("");
  const [archiveIdea, setArchiveIdea] = useState(false);
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
      archiveIdea,
    });

    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error.message);
      return;
    }
    // ישר לזיכרון החדש — שם אפשר להשלים את הסיפור (F7, spec סעיף 5).
    onCompleted(result.data.memoryId);
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-16">
      <p className="m-0 fw-700">איזה כיף — ספרו לנו על זה</p>
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
      <label className="flex items-center gap-8 text-md">
        <input
          type="checkbox"
          checked={archiveIdea}
          onChange={(e) => setArchiveIdea(e.target.checked)}
        />
        להעביר את הרעיון לארכיון
      </label>
      <div className="flex gap-12">
        <button type="submit" className="btn btn-primary btn-block" disabled={status === "busy"}>
          {status === "busy" ? "שומר..." : "שמירה בזיכרונות"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
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
