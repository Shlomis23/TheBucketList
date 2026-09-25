"use client";

import { useState, useTransition } from "react";
import { closeSpaceAction } from "@/app/account/actions";
import { CLOSE_CONFIRM_WORD } from "@/lib/validation/account";

export function CloseSpaceForm() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const ready = text.trim() === CLOSE_CONFIRM_WORD;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready || pending) return;
        setError("");
        startTransition(async () => {
          const result = await closeSpaceAction(text);
          if (result && !result.ok) setError(result.error.message);
        });
      }}
    >
      <div className="field">
        <label htmlFor="confirm-close">כדי לאשר, הקלידו &quot;{CLOSE_CONFIRM_WORD}&quot;</label>
        <input
          id="confirm-close"
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          enterKeyHint="done"
        />
      </div>
      {error && (
        <p role="alert" className="alert-error" style={{ marginTop: 10 }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-block btn-danger" disabled={!ready || pending} style={{ marginTop: 12 }}>
        {pending ? "סוגר…" : "סגירת המרחב"}
      </button>
    </form>
  );
}
