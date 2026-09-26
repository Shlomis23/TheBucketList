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
      <p className="status-msg text-center text-xs">
        אי אפשר להעביר לארכיון רעיון עם תוכנית פעילה — בטלו או השלימו אותה קודם.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {!confirming ? (
        <button
          type="button"
          className="link-plain text-center"
          disabled={isPending}
          onClick={() => setConfirming(true)}
        >
          {mode === "archive" ? "העברה לארכיון" : "שחזור מהארכיון"}
        </button>
      ) : (
        <div className="flex gap-8 items-center justify-center">
          <span className="status-msg text-sm">
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
        <p role="alert" className="alert-error text-center">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
