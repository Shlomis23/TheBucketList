import { ideaCategories, type IdeaCategory } from "@/lib/validation/idea";

// סינון/מיון של מאגר `/ideas` — spec סעיף 6 ("חיפוש, פילטר קטגוריה/מאצ'ים/
// תגובה שלי, מיון") ו-13.3 (listIdeas). המצב נשמר ב-URL (לא ב-state) כדי
// ש"אחורה" יחזיר לאותו סינון ושקישור ייפתח עם אותו סינון.
//
// הקובץ טהור (בלי server-only) כי גם השרת (page/DAL) וגם רכיבי הלקוח
// (IdeaFilterControls) בונים ממנו URL-ים — מקור אמת אחד לשמות הפרמטרים.

export const ideaListViews = ["all", "unreacted", "matches"] as const;
export type IdeaListView = (typeof ideaListViews)[number];

export const ideaListSorts = ["new", "old", "cheap", "short"] as const;
export type IdeaListSort = (typeof ideaListSorts)[number];

export const ideaListSortLabels: Record<IdeaListSort, string> = {
  new: "החדשים קודם",
  old: "הישנים קודם",
  cheap: "הכי זולים",
  short: "הכי קצרים",
};

export type IdeaListFilters = {
  status: "active" | "archived";
  q: string;
  view: IdeaListView;
  category: IdeaCategory | null;
  sort: IdeaListSort;
};

export const SEARCH_MAX_LENGTH = 100;

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// כל ערך לא מוכר נופל לברירת המחדל — URL ידני/ישן לא שובר את הדף.
export function parseIdeaListParams(raw: RawParams): IdeaListFilters {
  const status = first(raw.status) === "archived" ? "archived" : "active";
  const q = (first(raw.q) ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const viewRaw = first(raw.view);
  const view = (ideaListViews as readonly string[]).includes(viewRaw ?? "")
    ? (viewRaw as IdeaListView)
    : "all";
  const catRaw = first(raw.cat);
  const category = (ideaCategories as readonly string[]).includes(catRaw ?? "")
    ? (catRaw as IdeaCategory)
    : null;
  const sortRaw = first(raw.sort);
  const sort = (ideaListSorts as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as IdeaListSort)
    : "new";

  // בארכיון אין "עוד לא הגבתי"/"מאצ'ים" (אין תגובה לרעיון בארכיון, ו-
  // list_my_matches מחזיר רק פעילים) — מתעלמים מ-view שם.
  return { status, q, view: status === "archived" ? "all" : view, category, sort };
}

// בונה href ל-/ideas מהסינון הנוכחי + שינוי. ערכי ברירת מחדל לא נכתבים
// ל-URL כדי שיישאר נקי ("/ideas" ולא "/ideas?view=all&sort=new").
export function buildIdeasHref(current: IdeaListFilters, patch: Partial<IdeaListFilters> = {}): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.status === "archived") params.set("status", "archived");
  if (next.q) params.set("q", next.q);
  if (next.view !== "all" && next.status !== "archived") params.set("view", next.view);
  if (next.category) params.set("cat", next.category);
  if (next.sort !== "new") params.set("sort", next.sort);
  const qs = params.toString();
  return qs ? `/ideas?${qs}` : "/ideas";
}

export function hasNarrowingFilter(f: IdeaListFilters): boolean {
  return Boolean(f.q) || f.category !== null || f.view !== "all";
}
