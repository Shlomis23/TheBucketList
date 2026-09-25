"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlaceInput } from "@/components/PlaceInput";
import { createIdeaAction } from "../actions";
import { ideaCategories, categoryLabels, durationPresets, type IdeaCategory } from "@/lib/validation/idea";

// כותרת חובה + "הוסף פרטים" להרחבה — spec סעיף 6 (`/ideas/new`), 6.1.
// טיוטה נשמרת בזיכרון הדף בלבד (state), לא ב-localStorage/שרת עד שמירה.
export function NewIdeaForm() {
  const router = useRouter();
  const [requestId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [category, setCategory] = useState<IdeaCategory>("other");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [costShekels, setCostShekels] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "busy") return;
    setStatus("busy");
    setErrorMsg("");
    setFieldErrors({});

    const costMinor = costShekels.trim() === "" ? undefined : Math.round(Number(costShekels) * 100);
    const durationMinutesNum =
      durationMinutes.trim() === "" ? undefined : Math.round(Number(durationMinutes));

    const result = await createIdeaAction({
      requestId,
      title,
      description,
      category,
      locationText: locationText.trim() === "" ? undefined : locationText,
      placeId: locationText.trim() === "" ? undefined : (placeId ?? undefined),
      sourceUrl: sourceUrl.trim() === "" ? undefined : sourceUrl,
      costMinor: costMinor !== undefined && !Number.isNaN(costMinor) ? costMinor : undefined,
      durationMinutes:
        durationMinutesNum !== undefined && !Number.isNaN(durationMinutesNum)
          ? durationMinutesNum
          : undefined,
    });

    // בהצלחה ה-Server Action כבר עשה redirect ל-/ideas ולא נחזור לכאן.
    if (result && !result.ok) {
      setStatus("error");
      setErrorMsg(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label htmlFor="title">מה בא לכם לעשות?</label>
        <input
          id="title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="למשל: ארוחת ערב יפנית"
          className="input"
        />
        {fieldErrors.title && (
          <p role="alert" className="alert-error">
            {fieldErrors.title[0]}
          </p>
        )}
      </div>

      {!showDetails && (
        <button
          type="button"
          className="link-plain"
          style={{ alignSelf: "flex-start" }}
          onClick={() => setShowDetails(true)}
        >
          + הוספת פרטים (אופציונלי)
        </button>
      )}

      {showDetails && (
        <>
          <div className="field">
            <label>קטגוריה</label>
            <div className="chip-group" role="group" aria-label="קטגוריה">
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

          <div className="field">
            <label htmlFor="description">תיאור</label>
            <textarea
              id="description"
              maxLength={3000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea"
            />
          </div>

          <div className="field">
            <label htmlFor="locationText">מקום</label>
            <PlaceInput
              id="locationText"
              value={locationText}
              placeId={placeId}
              onChange={(text, pid) => {
                setLocationText(text);
                setPlaceId(pid);
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="sourceUrl">קישור</label>
            <input
              id="sourceUrl"
              type="url"
              dir="ltr"
              placeholder="https://"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="input"
            />
            {fieldErrors.sourceUrl && (
              <p role="alert" className="alert-error">
                {fieldErrors.sourceUrl[0]}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="cost">עלות משוערת (₪)</label>
              <input
                id="cost"
                type="number"
                min={0}
                inputMode="decimal"
                value={costShekels}
                onChange={(e) => setCostShekels(e.target.value)}
                className="input"
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="duration">משך</label>
              <select
                id="duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="input select-input"
              >
                <option value="">לא ידוע</option>
                {durationPresets.map((o) => (
                  <option key={o.minutes} value={String(o.minutes)}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary btn-block" disabled={status === "busy"}>
          {status === "busy" ? "שומר..." : "שמירת רעיון"}
        </button>
        <button
          type="button"
          className="btn"
          style={{ background: "transparent", border: "1.5px solid var(--color-border)" }}
          onClick={() => router.push("/ideas")}
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
