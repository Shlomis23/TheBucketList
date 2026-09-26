"use server";

import { getCalendarFeedToken } from "@/lib/dal/calendar";

// קישור היומן במינוי (0037) — מבוקש רק כשלוחצים "חיבור ליומן"/"העתקה",
// כדי לא ליצור טוקן לכל מי שסתם פתח את ההגדרות.
export async function calendarFeedAction(rotate: unknown = false) {
  return getCalendarFeedToken(rotate === true);
}
