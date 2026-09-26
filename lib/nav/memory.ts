// זיכרון ניווט בתוך האפליקציה (26.9): לאן "חזרה" מחזירה, ואיפה עצרנו לגלול
// בכל רשימה. מצב של מודול בדפדפן בלבד — מתאפס בסגירה מלאה של האפליקציה,
// וזה בכוונה (אחרי פתיחה מחדש מתחילים מלמעלה).
//
// למה לא לסמוך על הדפדפן: באפליקציה ממסך הבית באייפון אין כפתור אחורה,
// ו"אחורה" של הדפדפן החזיר את רשימת הרעיונות לנקודה שגויה (נמדד: הרשימה
// נפתחה בתחתית במקום על הרעיון שממנו נכנסו). לכן NavMemory שומר את
// המיקום בעצמו ומחזיר אותו.

// מסכי הרשימה — רק בהם שומרים ומשחזרים מיקום גלילה.
export const LIST_PATHS = ["/", "/ideas", "/plans", "/memories"] as const;

export function isListPath(pathname: string) {
  return (LIST_PATHS as readonly string[]).includes(pathname);
}

// טפסים לא נחשבים "מסך קודם": אחרי עריכה ושמירה, "חזרה" מדף הרעיון לא
// אמורה לפתוח שוב את טופס העריכה.
function isFormPath(pathname: string) {
  return /\/(new|edit)$/.test(pathname);
}

const pathOf = (url: string) => url.split("?")[0];

// ---- המצב ----
// כל רשומה בהיסטוריה של הדפדפן מקבלת מזהה (NavMemory מוסיף אותו ל-state
// ב-pushState). כך "אחורה" מזוהה לפי המזהה של הרשומה שחזרנו אליה — ולא לפי
// הכתובת, שיכולה לחזור על עצמה (שמירת עריכה מחזירה ל-/ideas/a ב-push).
type Entry = { id: string; url: string };
const stack: Entry[] = [];
const positions = new Map<string, number>(); // כתובת רשימה -> scrollY
const lastListUrl = new Map<string, string>(); // "/ideas" -> "/ideas?view=waiting"
let pendingRestoreUrl: string | null = null; // push עם בקשת שחזור (לשונית)
let frozen = false; // בזמן מעבר מסך — לא לשמור גלילה (הדף מתחלף מתחתינו)
let frozenSince = 0;

const SESSION = Math.random().toString(36).slice(2, 8);
let counter = 0;
export const ENTRY_KEY = "__blNav";
export function newEntryId() {
  return `${SESSION}-${++counter}`;
}

export function freezeSaving() {
  frozen = true;
  frozenSince = Date.now();
}
export function unfreezeSaving() {
  frozen = false;
}

// נקרא מאירוע גלילה. הגנה: אם "הקפאה" נשארה תלויה (לחיצה שלא הובילה
// לניווט), משתחררים אחרי שנייה וחצי.
export function saveScroll(url: string, y: number) {
  if (frozen && Date.now() - frozenSince < 1500) return;
  frozen = false;
  if (isListPath(pathOf(url))) positions.set(url, y);
}

/**
 * מעדכן את המחסנית כשהכתובת משתנה. entryId — המזהה של רשומת ההיסטוריה
 * הנוכחית (null לרשומה הראשונה, שנוצרה לפני שהאפליקציה עלתה). מחזיר לאיזה
 * מיקום לגלול, אם זו חזרה לרשימה (או לחיצת לשונית שביקשה שחזור).
 */
export function recordNavigation(url: string, entryId: string | null): { restoreTo: number | null } {
  const path = pathOf(url);
  if (isListPath(path)) lastListUrl.set(path, url);
  const id = entryId ?? "initial";

  let isBack = false;
  const i = stack.findIndex((e) => e.id === id);
  if (i >= 0 && i === stack.length - 1) {
    stack[i] = { id, url }; // אותה רשומה: replace (סינון/חיפוש) או רענון
  } else if (i >= 0) {
    stack.length = i + 1; // חזרנו לרשומה קודמת
    stack[i] = { id, url };
    isBack = true;
  } else {
    stack.push({ id, url });
  }

  const wantsRestore = isBack || pendingRestoreUrl === url;
  pendingRestoreUrl = null;
  if (!wantsRestore || !isListPath(path)) return { restoreTo: null };
  return { restoreTo: positions.get(url) ?? null };
}

// כמה צעדים אחורה עד המסך הקודם "האמיתי" (לא טופס, לא אותו דף שוב).
// אם נותן `toPath` — עד המופע האחרון של המסך הזה בלבד.
function stepsBack(toPath?: string): number {
  const current = stack[stack.length - 1]?.url ?? "";
  for (let i = stack.length - 2; i >= 0; i--) {
    const p = pathOf(stack[i].url);
    if (toPath !== undefined) {
      if (p === toPath) return stack.length - 1 - i;
      continue;
    }
    if (isFormPath(p) || p === pathOf(current)) continue;
    return stack.length - 1 - i;
  }
  return 0;
}

type Router = { push: (href: string, opts?: { scroll?: boolean }) => void };

function goSteps(n: number) {
  freezeSaving();
  window.history.go(-n);
}

// כפתור החזרה בדפי רעיון/תוכנית/זיכרון. בלי מסך קודם באפליקציה (נכנסו
// מהתראה) — לרשימה של האזור, למיקום השמור אם יש.
export function goBack(router: Router, fallbackList: string) {
  const n = stepsBack();
  if (n > 0) return goSteps(n);
  goToList(router, fallbackList);
}

function goToList(router: Router, listPath: string) {
  const url = lastListUrl.get(listPath) ?? listPath;
  pendingRestoreUrl = url;
  freezeSaving();
  router.push(url, { scroll: false });
}

/**
 * לחיצה על לשונית בניווט התחתון. מחזיר true אם טופל כאן (ואז מבטלים את
 * הניווט הרגיל של הקישור).
 * - כבר ברשימה של הלשונית: גלילה חלקה לראש הרשימה.
 * - בתוך האזור (רעיון מתוך הרשימה): חזרה לרשימה, לנקודה שבה עצרנו.
 * - אזור אחר: הקישור הרגיל — מסך חדש, מלמעלה.
 */
export function onTabTap(router: Router, tabPath: string, pathname: string): boolean {
  if (pathname === tabPath) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }
  if (tabPath !== "/" && pathname.startsWith(`${tabPath}/`)) {
    const n = stepsBack(tabPath);
    if (n > 0) goSteps(n);
    else goToList(router, tabPath);
    return true;
  }
  return false;
}

// לבדיקות בלבד.
export function __resetNavMemory() {
  stack.length = 0;
  positions.clear();
  lastListUrl.clear();
  pendingRestoreUrl = null;
  frozen = false;
}
