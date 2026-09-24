"use client";

import { useState } from "react";
import { createSpaceAction } from "./actions";

export function OnboardingForm() {
  const [displayName, setDisplayName] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "busy") return;
    setStatus("busy");
    setErrorMsg("");

    // requestId קבוע לאורך כל ניסיונות ה-retry של השליחה הזו -> createSpace אידמפוטנטית.
    const result = await createSpaceAction({ requestId, displayName });
    // בהצלחה ה-Server Action כבר עשה redirect ולא נחזור לכאן.
    if (result && !result.ok) {
      setStatus("error");
      setErrorMsg(result.error.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16, maxWidth: 360 }}
    >
      <label htmlFor="displayName">השם שלי</label>
      <input
        id="displayName"
        name="displayName"
        required
        maxLength={60}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        style={{ minHeight: 44, padding: "0 12px", border: "1px solid var(--color-border)" }}
      />
      <button type="submit" disabled={status === "busy"}>
        {status === "busy" ? "יוצר..." : "יצירת הרשימה שלנו"}
      </button>
      {status === "error" && (
        <p role="alert" style={{ color: "var(--color-primary)" }}>
          {errorMsg}
        </p>
      )}
    </form>
  );
}
