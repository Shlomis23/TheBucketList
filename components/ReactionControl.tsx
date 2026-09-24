"use client";

import { useState, useTransition } from "react";
import { setReactionAction } from "@/app/(app)/ideas/actions";

type Preference = "yes" | "maybe" | "no";

// שליטת תגובה משותפת ל-/ideas ו-/ideas/[id]. אופטימית: מעדכנת מקומית מיד,
// חוזרת אחורה אם ה-Server Action נכשל. אף פעם לא חושפת את תגובת בן/בת הזוג —
// setReaction בשרת מחזיר רק isMatch, לא את הערך של הצד השני.
export function ReactionControl({
  ideaId,
  initialReaction,
}: {
  ideaId: string;
  initialReaction: Preference | null;
}) {
  const [reaction, setReactionState] = useState(initialReaction);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function choose(next: Preference) {
    const prev = reaction;
    const nextValue = prev === next ? null : next; // לחיצה חוזרת מבטלת
    setReactionState(nextValue);
    setError("");
    startTransition(async () => {
      const result = await setReactionAction(ideaId, nextValue);
      if (!result.ok) {
        setReactionState(prev);
        setError(result.error.message);
      }
    });
  }

  return (
    <div>
      <div className="reaction-group" role="group" aria-label="התגובה שלי">
        <button
          type="button"
          className="reaction-btn yes"
          aria-pressed={reaction === "yes"}
          disabled={isPending}
          onClick={() => choose("yes")}
        >
          כן
        </button>
        <button
          type="button"
          className="reaction-btn maybe"
          aria-pressed={reaction === "maybe"}
          disabled={isPending}
          onClick={() => choose("maybe")}
        >
          אולי
        </button>
        <button
          type="button"
          className="reaction-btn no"
          aria-pressed={reaction === "no"}
          disabled={isPending}
          onClick={() => choose("no")}
        >
          לא
        </button>
      </div>
      {error && (
        <p role="alert" className="alert-error" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
