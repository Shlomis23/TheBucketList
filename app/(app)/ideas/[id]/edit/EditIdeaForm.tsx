"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateIdeaAction } from "../../actions";
import { ideaCategories, categoryLabels, durationOptionsFor, type IdeaCategory } from "@/lib/validation/idea";
import type { IdeaDetailDto } from "@/lib/dal/ideas";

// טופס עריכת רעיון קיים — spec, F4. בשונה מ-NewIdeaForm: כל השדות מוצגים
// תמיד (אין "+ הוספת פרטים"), כי כאן יש כבר נתונים למלא; ideaId+version
// (expectedVersion) נלווים לכל שליחה, ראו update_idea (0015).
export function EditIdeaForm({ idea }: { idea: IdeaDetailDto }) {
  const router = useRouter();
  const [title, setTitle] = useState(idea.title);
  const [category, setCategory] = useState<IdeaCategory>(idea.category);
  const [description, setDescription] = useState(idea.description);
  const [locationText, setLocationText] = useState(idea.locationText ?? "");
  const [sourceUrl, setSourceUrl] = useState(idea.sourceUrl ?? "");
  const [costShekels, setCostShekels] = useState(
    idea.costMinor !== null ? String(idea.costMinor / 100) : "",
  );
  const [durationMinutes, setDurationMinutes] = useState(
    idea.durationMinutes !== null ? String(idea.durationMinutes) : "",
  );
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

    const result = await updateIdeaAction({
      ideaId: idea.id,
      expectedVersion: idea.version,
      title,
      description,
      category,
      locationText: locationText.trim() === "" ? undefined : locationText,
      sourceUrl: sourceUrl.trim() === "" ? undefined : sourceUrl,
      costMinor: costMinor !== undefined && !Number.isNaN(costMinor) ? costMinor : undefined,
      durationMinutes:
        durationMinutesNum !== undefined && !Number.isNaN(durationMinutesNum)
          ? durationMinutesNum
          : undefined,
    });

    // בהצלחה ה-Server Action כבר עשה redirect ל-/ideas/[id] ולא נחזור לכאן.
    if (result && !result.ok) {
      setStatus("error");
      setErrorMsg(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label htmlFor="title">כותרת</label>
        <input
          id="title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
        />
        {fieldErrors.title && (
          <p role="alert" className="alert-error">
            {fieldErrors.title[0]}
          </p>
        )}
      </div>

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
        <input
          id="locationText"
          maxLength={200}
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          className="input"
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
            {durationOptionsFor(idea.durationMinutes).map((o) => (
              <option key={o.minutes} value={String(o.minutes)}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary btn-block" disabled={status === "busy"}>
          {status === "busy" ? "שומר..." : "שמירת שינויים"}
        </button>
        <button
          type="button"
          className="btn"
          style={{ background: "transparent", border: "1.5px solid var(--color-border)" }}
          onClick={() => router.push(`/ideas/${idea.id}`)}
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
