"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusScreen } from "@/components/StatusScreen";

// שגיאה לא צפויה בכל מסך — במקום "Application error" של Next באנגלית.
// "לנסות שוב" טוען מחדש את המסך מהשרת (retry). בלי חיבור — אומרים את זה.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    console.error(error);
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [error]);

  return (
    <StatusScreen
      icon="alert"
      title={offline ? "אין חיבור לאינטרנט" : "משהו השתבש"}
      text={
        offline
          ? "ברגע שהחיבור יחזור, אפשר לנסות שוב — שום דבר לא אבד."
          : "זו תקלה אצלנו, לא משהו שעשיתם. בדרך כלל ניסיון נוסף מספיק."
      }
    >
      <button type="button" className="btn btn-primary btn-block" onClick={() => retry()}>
        לנסות שוב
      </button>
      <Link
        href="/"
        className="btn btn-block"
        style={{ background: "transparent", border: "1.5px solid var(--color-border)", color: "var(--color-text)" }}
      >
        לדף הבית
      </Link>
      {error.digest && (
        <p className="status-msg" style={{ margin: "6px 0 0", fontSize: 11.5 }} dir="ltr">
          {error.digest}
        </p>
      )}
    </StatusScreen>
  );
}
