// המילה שמקלידים כדי לאשר סגירת מרחב — משותף לטופס ולפעולת השרת.
export const CLOSE_CONFIRM_WORD = "סגירה";
export const GRACE_DAYS = 14;

// "יום שני, 9 באוקטובר" — תאריך המחיקה הסופית.
export function formatPurgeDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Jerusalem",
  });
}

export function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}
