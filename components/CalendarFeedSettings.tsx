"use client";

import { useEffect, useState } from "react";
import { calendarFeedAction } from "@/app/(app)/calendar-actions";
import { CALENDAR_CONNECTED_KEY, calendarFeedUrls, markCalendarConnected } from "@/lib/calendarFeed";

// הגדרות ← יומן (26.9, 0037): כל התוכניות ביומן של הטלפון, מתעדכנות לבד.
// הקישור אישי וסודי — מי שמחזיק אותו רואה את התוכניות; "איפוס" מנפיק חדש.
export function CalendarFeedSettings() {
  const [urls, setUrls] = useState<ReturnType<typeof calendarFeedUrls> | null>(null);
  const [msg, setMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    calendarFeedAction()
      .then((res) => {
        if (res.ok) setUrls(calendarFeedUrls(res.data.token, window.location.origin));
        else setMsg(res.error.message);
      })
      .catch(() => setMsg("לא הצלחנו ליצור קישור ליומן, נסו שוב"));
  }, []);

  async function copy() {
    if (!urls) return;
    try {
      await navigator.clipboard.writeText(urls.https);
      setMsg("הקישור הועתק. ביומן גוגל: הוספת יומן ← מכתובת URL.");
    } catch {
      setMsg(urls.https);
    }
  }

  async function reset() {
    setConfirmReset(false);
    const res = await calendarFeedAction(true).catch(() => null);
    if (!res?.ok) return setMsg("האיפוס נכשל, נסו שוב");
    setUrls(calendarFeedUrls(res.data.token, window.location.origin));
    try {
      localStorage.removeItem(CALENDAR_CONNECTED_KEY);
    } catch {}
    setMsg("נוצר קישור חדש. היומן שחובר קודם יפסיק להתעדכן — אפשר לחבר מחדש.");
  }

  return (
    <div className="flex flex-col gap-8">
      <a
        href={urls?.webcal ?? "#"}
        className="btn btn-primary btn-block"
        aria-disabled={!urls}
        onClick={(e) => (urls ? markCalendarConnected() : e.preventDefault())}
      >
        חיבור ליומן האייפון
      </a>
      <a href={urls?.google ?? "#"} target="_blank" rel="noopener" className="btn btn-outline btn-block" aria-disabled={!urls}>
        חיבור ליומן גוגל
      </a>
      <button type="button" className="link-plain text-center" onClick={copy} disabled={!urls}>
        העתקת הקישור (ליומן אחר)
      </button>
      {confirmReset ? (
        <div className="delete-confirm">
          <p className="m-0 text-sm">לאפס את הקישור? יומן שכבר חובר יפסיק להתעדכן, ותצטרכו לחבר אותו מחדש.</p>
          <div className="flex gap-8 justify-center mt-8">
            <button type="button" className="btn btn-danger" onClick={reset}>
              איפוס
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setConfirmReset(false)}>
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="link-plain text-center text-xs c-muted" onClick={() => setConfirmReset(true)}>
          איפוס הקישור
        </button>
      )}
      {msg && <p className="status-msg m-0 text-sm text-center break-anywhere">{msg}</p>}
    </div>
  );
}
