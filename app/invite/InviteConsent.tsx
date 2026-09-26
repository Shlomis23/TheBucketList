"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ConsentState = "loading" | "missing" | "confirm" | "busy" | "error";

// מסך ההסכמה להצטרפות — F2, spec סעיף 5, 11.2.
// הטוקן נקרא מה-fragment (#token=...) בצד לקוח בלבד ומעולם לא נשלח ל-GET —
// הוא מנוקה מיד עם history.replaceState לפני שהמשתמש עושה משהו, ורק אחרי
// לחיצה מפורשת על "ממשיכים" הוא נשלח (POST same-origin) ל-exchange. ה-
// consent הזה הוא הגנה נוספת: אף לא בקשה אחת יוצאת לפני לחיצה מודעת.
export function InviteConsent() {
  const router = useRouter();
  const [state, setState] = useState<ConsentState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // חייב להיות effect (לא useSyncExternalStore): מבצע מוטציה אמיתית
    // (history.replaceState) בנוסף לקריאה, ולא רק קורא ערך יציב — וגם אחרי
    // הניקוי window.location.hash כבר לא משקף את הטוקן, אז אי אפשר לגזור
    // token/state בזמן רינדור מתוך location.hash החי. #token אף פעם לא
    // מגיע לשרת (ה-HTML הראשוני זהה בשרת ובלקוח: מצב "loading" בלבד),
    // אז אין hydration mismatch — רק setState לאחר mount, פעם אחת בלבד.
    const hash = window.location.hash;
    const match = /token=([^&]+)/.exec(hash);
    const extracted = match ? decodeURIComponent(match[1]) : null;

    if (hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    if (!extracted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- קריאת URL fragment חד-פעמית שאינה זמינה ב-SSR; ראו הערה למעלה.
      setState("missing");
      return;
    }
    setToken(extracted);
    setState("confirm");
  }, []);

  async function handleContinue() {
    if (!token) return;
    setState("busy");
    setErrorMsg("");

    try {
      const res = await fetch("/api/invitations/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;

      if (!res.ok || !body?.ok) {
        setState("error");
        setErrorMsg(
          res.status === 429
            ? "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות."
            : "הקישור לא תקין. אפשר לבקש קישור חדש מבן/בת הזוג.",
        );
        return;
      }
      router.push("/invite/continue");
    } catch {
      setState("error");
      setErrorMsg("משהו השתבש. נסו שוב.");
    }
  }

  if (state === "loading") return null;

  if (state === "missing") {
    return (
      <p className="status-msg">
        הקישור לא תקין או חסר. אפשר לבקש קישור הזמנה חדש מבן/בת הזוג.
      </p>
    );
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p className="status-msg" style={{ margin: 0 }}>
        הוזמנתם להצטרף ל-The Bucket List — הרשימה המשותפת שלכם.
      </p>
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={state === "busy"}
        onClick={handleContinue}
      >
        {state === "busy" ? "בודקים..." : "ממשיכים"}
      </button>
      {state === "error" && (
        <p role="alert" className="alert-error">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
