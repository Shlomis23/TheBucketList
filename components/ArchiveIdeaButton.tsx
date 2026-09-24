"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveIdeaAction, restoreIdeaAction } from "@/app/(app)/ideas/actions";

// כפתור ארכוב/שחזור ידני לרעיון — spec סעיף 13.2 (archiveIdea/restoreIdea).
// "ארכוב" חסום כל עוד יש תוכנית proposed לרעיון (blockedByActivePlan) —
// מוצג כטקסט מוחלש במקום כפתור פעיל, כדי לא לתת ללחוץ על משהו שממילא ייכשל.
export function ArchiveIdeaButton({
  ideaId,
  version,
  mode,
  blockedByActivePlan,
}: {
  ideaId: string;
  version: number;
  mode: "archive" | "restore";
  blockedByActivePlan?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  function run() {
    setErrorMsg("");
    startTransition(async () => {
      const result =
        mode === "archive" ? await archiveIdeaAction(ideaId, version) : await restoreIdeaAction(ideaId, version);
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  if (mode === "archive" && blockedByActivePlan) {
    return (
      <p className="status-msg" style={{ textAlign: "center", fontSize: 12.5 }}>
        אי אפשר להעביר לארכיון רעיון עם תוכנית פעילה — בטלו או השלימו אותה קודם.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {!confirming ? (
        <button
          type="button"
          className="link-plain"
          style={{ textAlign: "center" }}
          disabled={isPending}
          onClick={() => setConfirming(true)}
        >
          {mode === "archive" ? "העברה לארכיון" : "שחזור מהארכיון"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
          <span className="status-msg" style={{ fontSize: 13 }}>
            {mode === "archive" ? "להעביר את הרעיון לארכיון?" : "לשחזר את הרעיון מהארכיון?"}
          </span>
          <button type="button" className="link-plain" disabled={isPending} onClick={run}>
            כן
          </button>
          <button type="button" className="link-plain" disabled={isPending} onClick={() => setConfirming(false)}>
            לא
          </button>
        </div>
      )}
      {errorMsg && (
        <p role="alert" className="alert-error" style={{ textAlign: "center" }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
