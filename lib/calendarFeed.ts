// כתובות היומן במינוי (0037) מצד הלקוח. webcal:// — האייפון פותח "להירשם
// ליומן?"; גוגל — עמוד "הוספת יומן" עם הכתובת; https — להעתקה (יומן אחר).
export function calendarFeedUrls(token: string, origin: string) {
  const https = `${origin}/api/calendar/${token}.ics`;
  const webcal = https.replace(/^https?:/, "webcal:");
  return { https, webcal, google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}` };
}

// "כבר חיברת" — תזכורת מקומית בלבד (למכשיר הזה), כדי לא להציע שוב ושוב.
export const CALENDAR_CONNECTED_KEY = "bl-calendar-connected";
export function markCalendarConnected() {
  try {
    localStorage.setItem(CALENDAR_CONNECTED_KEY, "1");
  } catch {}
}
export function isCalendarConnected(): boolean {
  try {
    return localStorage.getItem(CALENDAR_CONNECTED_KEY) === "1";
  } catch {
    return false;
  }
}
