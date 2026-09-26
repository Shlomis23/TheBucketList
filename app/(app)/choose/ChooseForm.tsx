"use client";

import { useState } from "react";
import Link from "next/link";
import { chooseExperienceAction } from "./actions";
import { ideaCategories, categoryLabels, formatCostMinor, formatDurationMinutes, maxDurationPresets, type IdeaCategory } from "@/lib/validation/idea";
import { getIdeaCoverImage } from "@/lib/covers";
import type { ChooseCandidate } from "@/lib/dal/choose";

type Status = "idle" | "busy" | "error";

export function ChooseForm({ waitingForPartner }: { waitingForPartner: boolean }) {
  const [scope, setScope] = useState<"matches" | "all">(waitingForPartner ? "all" : "matches");
  const [category, setCategory] = useState<IdeaCategory | null>(null);
  const [maxBudget, setMaxBudget] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [locationText, setLocationText] = useState("");
  const [allowUnknown, setAllowUnknown] = useState(true);

  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [candidate, setCandidate] = useState<ChooseCandidate | null | undefined>(undefined);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function currentFilters(excluded: string[]) {
    return {
      scope,
      category: category ?? undefined,
      maxBudgetMinor: maxBudget.trim() === "" ? undefined : Math.round(Number(maxBudget) * 100),
      maxDurationMinutes: maxDuration.trim() === "" ? undefined : Math.round(Number(maxDuration)),
      locationText: locationText.trim() === "" ? undefined : locationText.trim(),
      allowUnknown,
      excludedIdeaIds: excluded,
    };
  }

  async function runSearch(excluded: string[]) {
    setStatus("busy");
    setErrorMsg("");
    const result = await chooseExperienceAction(currentFilters(excluded));
    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error.message);
      return;
    }
    setStatus("idle");
    setCandidate(result.data.candidate);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "busy") return;
    setExcludedIds([]);
    void runSearch([]);
  }

  function handleAnother() {
    if (status === "busy" || !candidate) return;
    const nextExcluded = [...excludedIds, candidate.id];
    setExcludedIds(nextExcluded);
    void runSearch(nextExcluded);
  }

  function handleRestartRound() {
    setExcludedIds([]);
    void runSearch([]);
  }

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="field">
          <label>מתוך</label>
          <div className="chip-group" role="group" aria-label="scope">
            <button
              type="button"
              className="chip"
              aria-pressed={scope === "matches"}
              onClick={() => setScope("matches")}
            >
              מהמאצ&apos;ים שלנו
            </button>
            <button type="button" className="chip" aria-pressed={scope === "all"} onClick={() => setScope("all")}>
              מכל הרעיונות
            </button>
          </div>
          {scope === "all" && (
            <p className="status-msg" style={{ fontSize: 12.5, marginTop: 2 }}>
              זו הצעה שעוד לא אושרה על ידי שניכם.
            </p>
          )}
        </div>

        <div className="field">
          <label>קטגוריה (אופציונלי)</label>
          <div className="chip-group" role="group" aria-label="קטגוריה">
            <button type="button" className="chip" aria-pressed={category === null} onClick={() => setCategory(null)}>
              הכל
            </button>
            {ideaCategories.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {categoryLabels[c]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="maxBudget">תקציב עד (₪)</label>
            <input
              id="maxBudget"
              type="number"
              min={0}
              inputMode="decimal"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              className="input"
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="maxDuration">משך</label>
            <select
              id="maxDuration"
              value={maxDuration}
              onChange={(e) => setMaxDuration(e.target.value)}
              className="input select-input"
            >
              <option value="">לא משנה</option>
              {maxDurationPresets.map((o) => (
                <option key={o.minutes} value={String(o.minutes)}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="locationText">מקום (אופציונלי)</label>
          <input
            id="locationText"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            className="input"
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5 }}>
          <input type="checkbox" checked={allowUnknown} onChange={(e) => setAllowUnknown(e.target.checked)} />
          לכלול גם רעיונות בלי תקציב/זמן/מקום ידוע
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={status === "busy"}>
          {status === "busy" ? "מחפשים..." : "מצאו לנו משהו"}
        </button>
        {status === "error" && (
          <p role="alert" className="alert-error">
            {errorMsg}
          </p>
        )}
      </form>

      {candidate !== undefined && (
        <div style={{ marginTop: 20 }}>
          {candidate === null ? (
            <div className="card">
              <p className="status-msg">אין מועמדים לפי התנאים האלה. אפשר להרחיב תנאים, או:</p>
              <button type="button" className="link-plain" style={{ marginTop: 8 }} onClick={handleRestartRound}>
                לנסות שוב מההתחלה
              </button>
            </div>
          ) : (
            <CandidateCard candidate={candidate} onAnother={handleAnother} busy={status === "busy"} />
          )}
        </div>
      )}
    </>
  );
}

function CandidateCard({
  candidate,
  onAnother,
  busy,
}: {
  candidate: ChooseCandidate;
  onAnother: () => void;
  busy: boolean;
}) {
  const cost = formatCostMinor(candidate.costMinor);
  const duration = formatDurationMinutes(candidate.durationMinutes);

  return (
    <div className="card">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי */}
      <img src={getIdeaCoverImage(candidate.category)} alt="" className="card-cover-img cover-lg" />
      <p className="page-eyebrow">מה דעתכם על</p>
      <p style={{ margin: "0 0 8px", fontWeight: 800, fontSize: 19 }}>{candidate.title}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span className="badge badge-neutral">{categoryLabels[candidate.category]}</span>
      </div>
      {(cost || duration || candidate.locationText) && (
        <p className="status-msg" style={{ marginBottom: 12 }}>
          {[cost, duration, candidate.locationText].filter(Boolean).join(" · ")}
        </p>
      )}
      {candidate.reasons.length > 0 && (
        <ul style={{ margin: "0 0 16px", paddingInlineStart: 18, color: "var(--color-muted)", fontSize: 13.5 }}>
          {candidate.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <Link href={`/plans/new?ideaId=${candidate.id}`} className="btn btn-primary" style={{ flex: 1 }}>
          בואו נתכנן את זה
        </Link>
        <button
          type="button"
          className="btn"
          style={{ flex: 1, background: "transparent", border: "1.5px solid var(--color-border)" }}
          onClick={onAnother}
          disabled={busy}
        >
          עוד הצעה
        </button>
      </div>
    </div>
  );
}
