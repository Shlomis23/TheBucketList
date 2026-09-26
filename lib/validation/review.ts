// "סבב החלטות" (26.9, אפשרות א): מעבר על רעיונות שעוד לא הגבתי עליהם,
// אחד-אחד. פונקציות טהורות — סדר הכרטיסים והסיכום בסוף (לבדיקות).

export type ReviewPref = "yes" | "maybe" | "no";

// סדר: קודם רעיונות שבן/בת הזוג כבר ענו עליהם (שם "כן" שלי יכול ליצור
// מאצ'), ובתוך כל קבוצה — החדש קודם. firstId (מהתראה על רעיון חדש) — ראשון.
export function orderForReview<T extends { id: string; createdAt: string; partnerAnswered: boolean }>(
  ideas: T[],
  firstId?: string | null,
): T[] {
  const sorted = [...ideas].sort(
    (a, b) => Number(b.partnerAnswered) - Number(a.partnerAnswered) || b.createdAt.localeCompare(a.createdAt),
  );
  const i = firstId ? sorted.findIndex((x) => x.id === firstId) : -1;
  if (i > 0) sorted.unshift(...sorted.splice(i, 1));
  return sorted;
}

export type ReviewTally = Record<ReviewPref, number>;

export function tallyAnswers(answers: ReviewPref[]): ReviewTally {
  const t: ReviewTally = { yes: 0, maybe: 0, no: 0 };
  for (const a of answers) t[a]++;
  return t;
}

// הבאנר ברשימה / השורה בבית: "קיאקים בכנרת, ארוחת בוקר במושבה" או
// "קיאקים בכנרת, ועוד 3".
// total — כשיש רק חלק מהשמות (בבית נשלפים עד 3), כמה יש בסך הכל.
export function pendingPreview(titles: string[], total = titles.length): string {
  if (titles.length === 0) return "";
  if (total <= 2) return titles.slice(0, total).join(", ");
  return `${titles[0]}, ועוד ${total - 1}`;
}

// החלקה: מעבר לסף = תשובה. ימינה = כן, שמאלה = לא (כמו במקלדת/אפליקציות
// מוכרות, גם בממשק מימין לשמאל — כיוון פיזי, לא כיוון קריאה).
export const SWIPE_THRESHOLD = 90;
export function swipeDecision(dx: number): ReviewPref | null {
  if (dx >= SWIPE_THRESHOLD) return "yes";
  if (dx <= -SWIPE_THRESHOLD) return "no";
  return null;
}

// התראה שבועית (lib/reminders.ts sendReviewNudges): "3 רעיונות מחכים לך".
export function reviewNudgeCopy(pending: number, sampleTitle: string): { title: string; body: string } {
  return {
    title: pending === 1 ? "רעיון אחד מחכה לך" : `${pending} רעיונות מחכים לך`,
    body: pending === 1 ? `${sampleTitle} · סבב של כמה שניות` : `${sampleTitle} ועוד — סבב של חצי דקה`,
  };
}
