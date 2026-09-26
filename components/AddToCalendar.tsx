"use client";

import { useState } from "react";
import { googleCalendarUrl } from "@/lib/calendar";
import { calendarFeedUrls, isCalendarConnected, markCalendarConnected } from "@/lib/calendarFeed";
import { calendarFeedAction } from "@/app/(app)/calendar-actions";

// "הוספה ליומן" בדף תוכנית (26.9). באייפון, קובץ יומן בודד לא נפתח מתוך
// האפליקציה המותקנת (מגבלה של אפל) — לכן "יומן אייפון" הוא חיבור חד-פעמי
// ליומן במינוי (0037): כל התוכניות נכנסות ומתעדכנות לבד. "יומן גוגל" —
// התוכנית הזו בלבד (עובד גם מהאפליקציה באנדרואיד).
type Plan = { id: string; title: string; startsAt: string; endsAt: string | null; meetingPlace: string | null; notes: string };

export function AddToCalendar({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [webcal, setWebcal] = useState<string | null>(null);
  const [error, setError] = useState("");

  // הקישור נטען כבר בפתיחה, כדי שהלחיצה על "יומן אייפון" תעבור ישר ליומן
  // (באייפון, מעבר לאפליקציה אחרת חייב לקרות מיד מהלחיצה).
  function expand() {
    setOpen(true);
    setConnected(isCalendarConnected());
    calendarFeedAction()
      .then((res) => {
        if (res.ok) setWebcal(calendarFeedUrls(res.data.token, window.location.origin).webcal);
        else setError(res.error.message);
      })
      .catch(() => setError("לא הצלחנו ליצור קישור ליומן, נסו שוב"));
  }

  function connectIphone() {
    if (!webcal) return;
    markCalendarConnected();
    setConnected(true);
    window.location.href = webcal;
  }

  function openGoogle() {
    const url = googleCalendarUrl({
      uid: `plan-${plan.id}@the-bucket-list`,
      title: plan.title,
      startsAt: plan.startsAt,
      endsAt: plan.endsAt,
      location: plan.meetingPlace,
      notes: plan.notes,
      url: `${window.location.origin}/plans/${plan.id}`,
    });
    window.open(url, "_blank", "noopener");
  }

  if (!open) {
    return (
      <button type="button" className="calendar-btn" onClick={expand}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M4 10h16M9 3v4M15 3v4M12 13v5M9.5 15.5h5" />
        </svg>
        הוספה ליומן
      </button>
    );
  }

  return (
    <div className="calendar-panel" role="group" aria-label="הוספה ליומן">
      {connected ? (
        <p className="m-0 text-sm">
          היומן של האייפון כבר מחובר — התוכנית תופיע בו לבד.{" "}
          <button type="button" className="link-plain text-sm" onClick={connectIphone} disabled={!webcal}>
            לחבר שוב
          </button>
        </p>
      ) : (
        <button type="button" className="btn btn-outline btn-block calendar-option" onClick={connectIphone} disabled={!webcal}>
          <span>יומן אייפון</span>
          <span className="calendar-option-sub">חיבור חד-פעמי — כל התוכניות נכנסות ומתעדכנות לבד</span>
        </button>
      )}
      <button type="button" className="btn btn-outline btn-block calendar-option" onClick={openGoogle}>
        <span>יומן גוגל</span>
        <span className="calendar-option-sub">רק התוכנית הזו</span>
      </button>
      {error && (
        <p role="alert" className="alert-error m-0">
          {error}
        </p>
      )}
    </div>
  );
}
