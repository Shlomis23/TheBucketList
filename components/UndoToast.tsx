"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteIdeaAction } from "@/app/(app)/ideas/actions";

// מחיקת רעיון עם "ביטול" (26.9). הכפתור בדף הרעיון לא מוחק מיד: הוא מתזמן
// מחיקה (scheduleIdeaDelete) וחוזר לרשימה. כאן — הודעה בתחתית המסך עם
// "ביטול" ל-5 שניות, והרעיון מוסתר מהרשימה בינתיים ([data-idea-id]). אחרי 5
// שניות (או כשהאפליקציה יורדת לרקע) — המחיקה עצמה בשרת. יושב ב-(app)/layout.
const EVENT = "bucket:pending-delete";
const UNDO_MS = 5000;

type Pending = { id: string; title: string; version: number };

export function scheduleIdeaDelete(p: Pending) {
  window.dispatchEvent(new CustomEvent<Pending>(EVENT, { detail: p }));
}

function hideStyleId(id: string) {
  return `pending-delete-${id}`;
}
function hideIdea(id: string) {
  const el = document.createElement("style");
  el.id = hideStyleId(id);
  el.textContent = `[data-idea-id="${CSS.escape(id)}"]{display:none !important}`;
  document.head.appendChild(el);
}
function unhideIdea(id: string) {
  document.getElementById(hideStyleId(id))?.remove();
}

export function UndoToast() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState("");
  const pendingRef = useRef<Pending | null>(null);
  const timer = useRef(0);

  const commit = useCallback(() => {
    const p = pendingRef.current;
    if (!p) return;
    window.clearTimeout(timer.current);
    pendingRef.current = null;
    setPending(null);
    deleteIdeaAction(p.id, p.version)
      .then((res) => {
        unhideIdea(p.id);
        if (!res.ok) setError(`"${p.title}" לא נמחק: ${res.error.message}`);
      })
      .catch(() => {
        unhideIdea(p.id);
        setError(`"${p.title}" לא נמחק — נסו שוב`);
      });
  }, []);

  const undo = useCallback(() => {
    const p = pendingRef.current;
    if (!p) return;
    window.clearTimeout(timer.current);
    pendingRef.current = null;
    setPending(null);
    unhideIdea(p.id);
  }, []);

  useEffect(() => {
    const onPending = (e: Event) => {
      const next = (e as CustomEvent<Pending>).detail;
      if (!next?.id) return;
      commit(); // מחיקה קודמת שעוד חיכתה — יוצאת לפועל עכשיו
      setError("");
      pendingRef.current = next;
      setPending(next);
      hideIdea(next.id);
      timer.current = window.setTimeout(commit, UNDO_MS);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") commit();
    };
    window.addEventListener(EVENT, onPending);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", commit);
    return () => {
      window.removeEventListener(EVENT, onPending);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", commit);
    };
  }, [commit]);

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(""), 6000);
    return () => window.clearTimeout(t);
  }, [error]);

  if (!pending && !error) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {pending ? (
        <>
          <span className="toast-text">&quot;{pending.title}&quot; נמחק</span>
          <button type="button" className="toast-action" onClick={undo}>
            ביטול
          </button>
        </>
      ) : (
        <span className="toast-text">{error}</span>
      )}
    </div>
  );
}
