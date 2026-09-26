// הוספת תוכנית ליומן (26.9). פונקציות טהורות (לבדיקות):
//   buildIcs — קובץ .ics (יומן אייפון/אאוטלוק/כל יומן), RFC 5545.
//   googleCalendarUrl — קישור "הוסף ליומן" של גוגל (אנדרואיד).
// זמנים ב-UTC (…Z) — היומן מציג לפי שעון המכשיר. בלי שעת סיום: שעתיים.

export type CalendarEvent = {
  uid: string; // קבוע לתוכנית — הוספה חוזרת מעדכנת במקום לשכפל (ביומנים שתומכים)
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  notes: string;
  url: string; // קישור לתוכנית באפליקציה
};

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
const REMIND_BEFORE = "-PT2H";

export function eventEnd(e: Pick<CalendarEvent, "startsAt" | "endsAt">): string {
  return e.endsAt ?? new Date(new Date(e.startsAt).getTime() + DEFAULT_DURATION_MS).toISOString();
}

// 2026-10-13T18:00:00.000Z -> 20261013T180000Z
export function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// שורה עד 75 בתים (לא תווים — עברית היא 2 בתים לתו ב-UTF-8), המשך
// מתחיל ברווח. לא חותכים תו באמצע.
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // שורת המשך: הרווח תופס בית
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

function description(e: CalendarEvent): string {
  return [e.notes.trim(), `בתוכנית ב-The Bucket List: ${e.url}`].filter(Boolean).join("\n\n");
}

export function buildIcs(e: CalendarEvent, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Bucket List//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${icsDate(now.toISOString())}`,
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(eventEnd(e))}`,
    `SUMMARY:${icsEscape(e.title)}`,
    ...(e.location ? [`LOCATION:${icsEscape(e.location)}`] : []),
    `DESCRIPTION:${icsEscape(description(e))}`,
    `URL:${e.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(e.title)}`,
    `TRIGGER:${REMIND_BEFORE}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${icsDate(e.startsAt)}/${icsDate(eventEnd(e))}`,
    details: description(e),
  });
  if (e.location) params.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
