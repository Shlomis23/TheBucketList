// תצוגה מקדימה של רעיון (27.9): כשלוחצים על רעיון ברשימה, מה שכבר ידוע עליו
// (שם, קטגוריה, מחיר/משך) נשמר כאן, ושלד הטעינה של /ideas/[id] מציג אותו
// מיד — עוד לפני שהשרת ענה. כך המסך שמחליק פנימה הוא כבר הרעיון עצמו, ורק
// החלק התחתון (תגובות, שיחה) מתמלא אחר כך.
//
// המידע עובר על הקישור עצמו (data-preview), ו-NavMemory קורא אותו בלחיצה —
// בלי שהרשימה (רכיב שרת) תצטרך קוד לקוח משלה.
import { categoryLabels, formatCostMinor, formatDurationMinutes, type IdeaCategory } from "@/lib/validation/idea";

export type IdeaPreview = {
  title: string;
  category: IdeaCategory;
  isMatch?: boolean;
  archived?: boolean;
  subtitle?: string;
};

type PreviewSource = {
  title: string;
  category: IdeaCategory;
  isMatch?: boolean;
  status?: string;
  costMinor?: number | null;
  durationMinutes?: number | null;
};

/** המאפיין לקישור: <Link {...previewAttr(idea)} /> */
export function previewAttr(idea: PreviewSource): { "data-preview": string } {
  const subtitle = [formatCostMinor(idea.costMinor ?? null), formatDurationMinutes(idea.durationMinutes ?? null)]
    .filter(Boolean)
    .join(" · ");
  const p: IdeaPreview = {
    title: idea.title,
    category: idea.category,
    ...(idea.isMatch ? { isMatch: true } : {}),
    ...(idea.status === "archived" ? { archived: true } : {}),
    ...(subtitle ? { subtitle } : {}),
  };
  return { "data-preview": JSON.stringify(p) };
}

// כתובת -> תצוגה. מצב מודול בדפדפן; נשמרות רק האחרונות.
const previews = new Map<string, IdeaPreview>();
const MAX = 20;
// הלחיצה האחרונה: שלד הטעינה עולה לפעמים לפני שהכתובת בדפדפן התעדכנה,
// ואז הוא לא יודע לאיזה רעיון נכנסים — לוקחים את זה שנלחץ עכשיו.
let recent: { preview: IdeaPreview; at: number } | null = null;
const RECENT_MS = 4000;

function isPreview(v: unknown): v is IdeaPreview {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.title === "string" && typeof o.category === "string" && o.category in categoryLabels;
}

/** נקרא מ-NavMemory בלחיצה על קישור. */
export function rememberPreview(href: string, raw: string | null | undefined) {
  recent = null; // קישור אחר (בלי תצוגה) — לא להציג רעיון קודם בטעות
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPreview(parsed)) return;
    previews.delete(href);
    previews.set(href, parsed);
    if (href.startsWith("/ideas/")) recent = { preview: parsed, at: Date.now() };
    if (previews.size > MAX) previews.delete(previews.keys().next().value as string);
  } catch {
    // מאפיין פגום — פשוט בלי תצוגה מקדימה
  }
}

export function getPreview(href: string): IdeaPreview | null {
  if (previews.has(href)) return previews.get(href) ?? null;
  // הכתובת עוד לא התעדכנה (עדיין /ideas או הבית) — הרעיון שנלחץ הרגע.
  if (recent && !/^\/ideas\/[^/]+$/.test(href) && Date.now() - recent.at < RECENT_MS) return recent.preview;
  return null;
}

/** הרעיון שנלחץ ממש עכשיו (אם יש) — לשלד של /ideas, ראו IdeaOrListSkeleton. */
export function getRecentPreview(): IdeaPreview | null {
  return recent && Date.now() - recent.at < RECENT_MS ? recent.preview : null;
}
