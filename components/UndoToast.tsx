"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteIdeaAction } from "@/app/(app)/ideas/actions";

// הודעה בתחתית המסך עם "ביטול" (26.9). שני סוגים:
//   onCommit — הפעולה עוד לא בוצעה (מחיקת רעיון, ביטול תוכנית): הפריט
//     מוסתר מהמסך (hideSelector), ואחרי 5 שניות — או כשהאפליקציה יורדת
//     לרקע — היא יוצאת לפועל בשרת. "ביטול" = כלום לא קרה.
//   onUndo — הפעולה כבר בוצעה והיא הפיכה (העברה לארכיון): "ביטול" מחזיר.
// יושב ב-(app)/layout; קוראים לו דרך showToast מכל מקום.
const EVENT = "bucket:toast";
const UNDO_MS = 5000;

type Outcome = { ok: boolean; error?: { message: string } } | void;
export type ToastRequest = {
  message: string;
  hideSelector?: string;
  onCommit?: () => Promise<Outcome>;
  onUndo?: () => unknown;
  failMessage?: string; // כשהפעולה נכשלה בשרת
};

export function showToast(req: ToastRequest) {
  window.dispatchEvent(new CustomEvent<ToastRequest>(EVENT, { detail: req }));
}

export function scheduleIdeaDelete(p: { id: string; title: string; version: number }) {
  showToast({
    message: `"${p.title}" נמחק`,
    hideSelector: `[data-idea-id="${p.id}"]`,
    onCommit: () => deleteIdeaAction(p.id, p.version),
    failMessage: `"${p.title}" לא נמחק`,
  });
}

let styleSeq = 0;
function hide(selector: string): () => void {
  const el = document.createElement("style");
  el.id = `toast-hide-${++styleSeq}`;
  el.textContent = `${selector}{display:none !important}`;
  document.head.appendChild(el);
  return () => el.remove();
}

type Active = ToastRequest & { unhide: () => void };

export function UndoToast() {
  const [active, setActive] = useState<Active | null>(null);
  const [error, setError] = useState("");
  const ref = useRef<Active | null>(null);
  const timer = useRef(0);

  const finish = useCallback((commit: boolean) => {
    const a = ref.current;
    if (!a) return;
    window.clearTimeout(timer.current);
    ref.current = null;
    setActive(null);
    if (!commit || !a.onCommit) {
      a.unhide();
      return;
    }
    a.onCommit()
      .then((res) => {
        a.unhide();
        if (res && !res.ok) setError(`${a.failMessage ?? "הפעולה נכשלה"}: ${res.error?.message ?? "נסו שוב"}`);
      })
      .catch(() => {
        a.unhide();
        setError(`${a.failMessage ?? "הפעולה נכשלה"} — נסו שוב`);
      });
  }, []);

  const undo = useCallback(() => {
    const a = ref.current;
    if (!a) return;
    finish(false); // בלי commit
    if (a.onUndo) Promise.resolve(a.onUndo()).catch(() => setError("הביטול נכשל — נסו שוב"));
  }, [finish]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const req = (e as CustomEvent<ToastRequest>).detail;
      if (!req?.message) return;
      finish(true); // הודעה קודמת שעוד חיכתה — הפעולה שלה יוצאת לפועל עכשיו
      setError("");
      const next: Active = { ...req, unhide: req.hideSelector ? hide(req.hideSelector) : () => {} };
      ref.current = next;
      setActive(next);
      timer.current = window.setTimeout(() => finish(true), UNDO_MS);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") finish(true);
    };
    const onPageHide = () => finish(true);
    window.addEventListener(EVENT, onToast);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener(EVENT, onToast);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [finish]);

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(""), 6000);
    return () => window.clearTimeout(t);
  }, [error]);

  if (!active && !error) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {active ? (
        <>
          <span className="toast-text">{active.message}</span>
          {(active.onUndo || active.onCommit) && (
            <button type="button" className="toast-action" onClick={undo}>
              ביטול
            </button>
          )}
        </>
      ) : (
        <span className="toast-text">{error}</span>
      )}
    </div>
  );
}
