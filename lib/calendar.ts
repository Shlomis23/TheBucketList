import { googleMapsUrl, wazeUrl } from "@/lib/navLinks";

// יומן (26.9). פונקציות טהורות (לבדיקות):
//   buildCalendar — יומן .ics (RFC 5545) עם כל התוכניות — היומן במינוי
//     (/api/calendar/<token>.ics, 0037). buildIcs — אירוע בודד.
//   googleCalendarUrl — קישור "הוסף ליומן" של גוגל לתוכנית בודדת.
// זמנים ב-UTC (…Z) — היומן מציג לפי שעון המכשיר. בלי שעת סיום: שעתיים.

export type CalendarEvent = {
  uid: string; // קבוע לתוכנית — הוספה חוזרת מעדכנת במקום לשכפל (ביומנים שתומכים)
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  notes: string;
  url: string; // קישור לתוכנית באפליקציה
  updatedAt?: string; // LAST-MODIFIED — היומן יודע שהתוכנית השתנתה
  // אירוע שעומד בפני עצמו (26.9): באייפון הקישור מהיומן לא פותח את
  // האפליקציה המותקנת, אז ניווט, תקציב וקישור מהרעיון — בתוך האירוע.
  placeId?: string | null; // Google place_id — רק כשהמקום הוא המקום של הרעיון
  budget?: string | null; // מפורמט ("₪380")
  sourceUrl?: string | null; // הקישור מהרעיון
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

// מקום לאירוע: נקודת המפגש של התוכנית, ואם אין — המקום של הרעיון (ואז גם
// ה-place_id שלו לניווט מדויק; לנקודת מפגש אחרת אין place_id).
export function planCalendarPlace(
  meetingPlace: string | null,
  ideaLocation: string | null,
  ideaPlaceId: string | null,
): { location: string | null; placeId: string | null } {
  if (meetingPlace && meetingPlace !== ideaLocation) return { location: meetingPlace, placeId: null };
  const location = meetingPlace ?? ideaLocation;
  return { location, placeId: location ? ideaPlaceId : null };
}

export function eventDescription(e: CalendarEvent): string {
  const details = [
    e.location ? `ניווט ב-Waze: ${wazeUrl(e.location)}` : "",
    e.location ? `מפות גוגל: ${googleMapsUrl(e.location, e.placeId)}` : "",
    e.budget ? `תקציב: ${e.budget}` : "",
    e.sourceUrl ? `קישור: ${e.sourceUrl}` : "",
  ].filter(Boolean);
  return [e.notes.trim(), details.join("\n"), `ב-The Bucket List: ${e.url}`].filter(Boolean).join("\n\n");
}

function veventLines(e: CalendarEvent, now: Date): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${icsDate(now.toISOString())}`,
    ...(e.updatedAt ? [`LAST-MODIFIED:${icsDate(e.updatedAt)}`] : []),
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(eventEnd(e))}`,
    `SUMMARY:${icsEscape(e.title)}`,
    ...(e.location ? [`LOCATION:${icsEscape(e.location)}`] : []),
    `DESCRIPTION:${icsEscape(eventDescription(e))}`,
    `URL:${e.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(e.title)}`,
    `TRIGGER:${REMIND_BEFORE}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

// יומן שלם. name — השם שמופיע ברשימת היומנים בטלפון. REFRESH-INTERVAL /
// X-PUBLISHED-TTL — בקשה (לא הבטחה) מהיומן לרענן כל שעה.
export function buildCalendar(events: CalendarEvent[], opts: { name?: string; now?: Date } = {}): string {
  const now = opts.now ?? new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Bucket List//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(opts.name ? [`X-WR-CALNAME:${icsEscape(opts.name)}`, "X-WR-TIMEZONE:Asia/Jerusalem", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"] : []),
    ...events.flatMap((e) => veventLines(e, now)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function buildIcs(e: CalendarEvent, now = new Date()): string {
  return buildCalendar([e], { now });
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${icsDate(e.startsAt)}/${icsDate(eventEnd(e))}`,
    details: eventDescription(e),
  });
  if (e.location) params.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
