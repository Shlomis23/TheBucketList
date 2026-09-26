"use client";

import { useState } from "react";
import { googleCalendarUrl } from "@/lib/calendar";

// "הוספה ליומן" בדף תוכנית (26.9). שתי אפשרויות: קובץ .ics (יומן אייפון,
// אאוטלוק, כל יומן) בקישור חתום, ויומן גוגל (אנדרואיד). התוכנית נכנסת ליומן
// עם תזכורת שעתיים לפני. שינוי מועד אחר כך — מוסיפים שוב.
export function AddToCalendar({
  icsHref,
  plan,
}: {
  icsHref: string;
  plan: { id: string; title: string; startsAt: string; endsAt: string | null; meetingPlace: string | null; notes: string };
}) {
  const [open, setOpen] = useState(false);

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
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="calendar-btn" onClick={() => setOpen(true)} aria-expanded={false}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M4 10h16M9 3v4M15 3v4M12 13v5M9.5 15.5h5" />
        </svg>
        הוספה ליומן
      </button>
    );
  }
  return (
    <div className="calendar-options" role="group" aria-label="הוספה ליומן">
      <a href={icsHref} target="_blank" rel="noopener" className="btn btn-outline" onClick={() => setOpen(false)}>
        יומן אייפון / אחר
      </a>
      <button type="button" className="btn btn-outline" onClick={openGoogle}>
        יומן גוגל
      </button>
    </div>
  );
}
