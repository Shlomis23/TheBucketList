// תצוגה מקדימה (27.9): כשלוחצים על רעיון, תוכנית או זיכרון, מה שכבר ידוע
// עליהם ברשימה (שם, קטגוריה, מועד, תמונת שער) נשמר כאן, ושלד הטעינה של דף
// הפרטים מציג אותו מיד — עוד לפני שהשרת ענה. כך המסך שמחליק פנימה הוא כבר
// הפריט עצמו, ורק מה שמתחת מתמלא אחר כך.
//
// המידע עובר על הקישור עצמו (data-preview), ו-NavMemory קורא אותו בלחיצה —
// בלי שהרשימות (רכיבי שרת) יצטרכו קוד לקוח משלהן. השלדים עצמם:
// components/DetailSkeletons.tsx.
import { categoryLabels, formatCostMinor, formatDurationMinutes, type IdeaCategory } from "@/lib/validation/idea";
import type { PlanStatus } from "@/lib/dal/plans";

export type IdeaPreview = {
  kind: "idea";
  title: string;
  category: IdeaCategory;
  isMatch?: boolean;
  archived?: boolean;
  subtitle?: string;
};
// מועד התוכנית מעוצב בדפדפן (כמו ב-PlanDetail, רכיב לקוח) — לכן נשמר גולמי.
export type PlanPreview = {
  kind: "plan";
  title: string;
  category: IdeaCategory | null;
  status: PlanStatus;
  startsAt: string | null;
  meetingPlace: string | null;
};
// תאריך הזיכרון מעוצב בשרת (כמו בדף הזיכרון) — לכן נשמר מוכן.
export type MemoryPreview = {
  kind: "memory";
  title: string;
  category: IdeaCategory | null;
  dateLabel: string;
  coverPhotoId: string | null;
  planId: string;
};
export type Preview = IdeaPreview | PlanPreview | MemoryPreview;
export type PreviewKind = Preview["kind"];
type PreviewOf<K extends PreviewKind> = Extract<Preview, { kind: K }>;

type Attr = { "data-preview": string };
const attr = (p: Preview): Attr => ({ "data-preview": JSON.stringify(p) });

/** <Link {...ideaPreviewAttr(idea)} /> */
export function ideaPreviewAttr(idea: {
  title: string;
  category: IdeaCategory;
  isMatch?: boolean;
  status?: string;
  costMinor?: number | null;
  durationMinutes?: number | null;
}): Attr {
  const subtitle = [formatCostMinor(idea.costMinor ?? null), formatDurationMinutes(idea.durationMinutes ?? null)]
    .filter(Boolean)
    .join(" · ");
  return attr({
    kind: "idea",
    title: idea.title,
    category: idea.category,
    ...(idea.isMatch ? { isMatch: true } : {}),
    ...(idea.status === "archived" ? { archived: true } : {}),
    ...(subtitle ? { subtitle } : {}),
  });
}

/** <Link {...planPreviewAttr(plan)} /> — status חסר = מוצעת (כרטיסי הבית). */
export function planPreviewAttr(plan: {
  title: string;
  ideaCategory: IdeaCategory | null;
  status?: PlanStatus;
  startsAt: string | null;
  meetingPlace: string | null;
}): Attr {
  return attr({
    kind: "plan",
    title: plan.title,
    category: plan.ideaCategory,
    status: plan.status ?? "proposed",
    startsAt: plan.startsAt,
    meetingPlace: plan.meetingPlace,
  });
}

/** <Link {...memoryPreviewAttr(memory, formatMemoryDate(memory.happenedOn))} /> */
export function memoryPreviewAttr(
  memory: { title: string; category: IdeaCategory | null; coverPhotoId: string | null; planId: string },
  dateLabel: string,
): Attr {
  return attr({
    kind: "memory",
    title: memory.title,
    category: memory.category,
    dateLabel,
    coverPhotoId: memory.coverPhotoId,
    planId: memory.planId,
  });
}

// ---- המצב (בדפדפן בלבד) ----
const previews = new Map<string, Preview>(); // כתובת -> תצוגה; נשמרות רק האחרונות
const MAX = 30;
// הלחיצה האחרונה: שלד הטעינה עולה לפעמים לפני שהכתובת בדפדפן התעדכנה,
// ואז הוא לא יודע לאיזה פריט נכנסים — לוקחים את זה שנלחץ עכשיו.
let recent: { preview: Preview; at: number } | null = null;
const RECENT_MS = 4000;

const DETAIL_PATH: Record<PreviewKind, RegExp> = {
  idea: /^\/ideas\/[^/]+$/,
  plan: /^\/plans\/[^/]+$/,
  memory: /^\/memories\/[^/]+$/,
};

const isCategory = (v: unknown) => typeof v === "string" && v in categoryLabels;
const isStrOrNull = (v: unknown) => v === null || typeof v === "string";

function isPreview(v: unknown): v is Preview {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.title !== "string") return false;
  switch (o.kind) {
    case "idea":
      return isCategory(o.category);
    case "plan":
      return (
        (o.category === null || isCategory(o.category)) &&
        (o.status === "proposed" || o.status === "completed" || o.status === "cancelled") &&
        isStrOrNull(o.startsAt) &&
        isStrOrNull(o.meetingPlace)
      );
    case "memory":
      return (
        (o.category === null || isCategory(o.category)) &&
        typeof o.dateLabel === "string" &&
        isStrOrNull(o.coverPhotoId) &&
        typeof o.planId === "string"
      );
    default:
      return false;
  }
}

/** נקרא מ-NavMemory בלחיצה על קישור (href בלי query). */
export function rememberPreview(href: string, raw: string | null | undefined) {
  recent = null; // קישור אחר (בלי תצוגה) — לא להציג פריט קודם בטעות
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPreview(parsed) || !DETAIL_PATH[parsed.kind].test(href)) return;
    previews.delete(href);
    previews.set(href, parsed);
    recent = { preview: parsed, at: Date.now() };
    if (previews.size > MAX) previews.delete(previews.keys().next().value as string);
  } catch {
    // מאפיין פגום — פשוט בלי תצוגה מקדימה
  }
}

/**
 * התצוגה לדף הפרטים שבכתובת pathname. אם הכתובת עוד לא התעדכנה (עדיין
 * ברשימה או בבית) — הפריט מהסוג הזה שנלחץ הרגע.
 */
export function getPreview<K extends PreviewKind>(pathname: string, kind: K): PreviewOf<K> | null {
  const byUrl = previews.get(pathname);
  if (byUrl) return byUrl.kind === kind ? (byUrl as PreviewOf<K>) : null;
  if (DETAIL_PATH[kind].test(pathname)) return null; // דף פרטים אחר, בלי תצוגה
  const r = getRecentPreview();
  return r?.kind === kind ? (r as PreviewOf<K>) : null;
}

/** הפריט שנלחץ ממש עכשיו (אם יש). */
export function getRecentPreview(): Preview | null {
  return recent && Date.now() - recent.at < RECENT_MS ? recent.preview : null;
}
