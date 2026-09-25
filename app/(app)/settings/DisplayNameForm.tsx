"use client";

import { useState, useTransition } from "react";
import { updateDisplayNameAction } from "./actions";

// עריכת השם שלי בהגדרות. "נשמר" מוצג רק אחרי תשובה מוצלחת מהשרת —
// לא הצלחה מדומה (spec סעיף 6, "שגיאת סגירה אינה מוחקת UI בהצלחה מדומה").
export function DisplayNameForm({ initialName, partnerName }: { initialName: string; partnerName: string | null }) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const trimmed = name.trim();
  const unchanged = trimmed === saved.trim();
  const invalid = trimmed.length < 1 || trimmed.length > 60;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || unchanged || invalid) return;
    setMessage(null);
    startTransition(async () => {
      const result = await updateDisplayNameAction(trimmed);
      if (result.ok) {
        setSaved(result.data.displayName);
        setName(result.data.displayName);
        setMessage({ kind: "ok", text: "נשמר" });
      } else {
        setMessage({ kind: "error", text: result.error.message });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="displayName">איך לקרוא לך</label>
        <input
          id="displayName"
          className="input"
          autoComplete="given-name"
          maxLength={60}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setMessage(null);
          }}
          aria-invalid={invalid}
          aria-describedby="displayName-hint"
        />
      </div>
      <p id="displayName-hint" className="status-msg" style={{ margin: "0 0 10px", fontSize: 12.5 }}>
        כך השם שלך מופיע אצל {partnerName ?? "בן/בת הזוג"} באפליקציה.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="submit" className="btn btn-primary" disabled={pending || unchanged || invalid}>
          {pending ? "שומרים…" : "שמירה"}
        </button>
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={message.kind === "error" ? "alert-error" : "status-msg"}
            style={{ margin: 0, fontSize: 13.5, color: message.kind === "ok" ? "var(--badge-green-text)" : undefined }}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
