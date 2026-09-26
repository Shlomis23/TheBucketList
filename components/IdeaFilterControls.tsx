"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { categoryLabels, ideaCategories, type IdeaCategory } from "@/lib/validation/idea";
import {
  buildIdeasHref,
  ideaListSortLabels,
  ideaListSorts,
  SEARCH_MAX_LENGTH,
  type IdeaListFilters,
  type IdeaListSort,
} from "@/lib/validation/ideaList";

// פקדי הסינון של /ideas שצריכים JS (חיפוש תוך כדי הקלדה, select-ים).
// הצ'יפים של התצוגה הם <Link> רגילים בצד השרת. אין כאן useSearchParams:
// הסינון הנוכחי מגיע כ-prop מה-page (שכבר פירסר אותו), וכל שינוי בונה
// URL דרך buildIdeasHref — מקור אמת אחד לפרמטרים.
//
// router.replace ולא push: הקלדה בחיפוש לא אמורה למלא את ההיסטוריה בעשרות
// רשומות. scroll:false — שינוי סינון לא קופץ לראש הדף.

function useFilterNavigation() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navigate = (href: string) =>
    startTransition(() => router.replace(href, { scroll: false }));
  return { navigate, isPending };
}

const SEARCH_DEBOUNCE_MS = 350;

export function IdeaSearch({ filters }: { filters: IdeaListFilters }) {
  const { navigate, isPending } = useFilterNavigation();
  const [value, setValue] = useState(filters.q);
  // הסינון האחרון שהגיע מהשרת — כדי שה-debounce יבנה URL עם הקטגוריה/
  // המיון העדכניים גם אם השתנו בזמן שהמשתמש מקליד.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === filtersRef.current.q) return;
    const t = setTimeout(() => navigate(buildIdeasHref(filtersRef.current, { q: trimmed })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // navigate יציב מספיק לענייננו; תלות רק בערך המוקלד.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(buildIdeasHref(filtersRef.current, { q: value.trim() }));
      }}
      style={{ marginBottom: 12 }}
    >
      <input
        type="search"
        className="input"
        placeholder="חיפוש רעיון…"
        aria-label="חיפוש רעיון"
        enterKeyHint="search"
        maxLength={SEARCH_MAX_LENGTH}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-busy={isPending}
        style={{ minHeight: 42 }}
      />
    </form>
  );
}

export function CategorySelect({ filters }: { filters: IdeaListFilters }) {
  const { navigate } = useFilterNavigation();
  return (
    <select
      className={filters.category ? "chip chip-select is-set" : "chip chip-select"}
      aria-label="סינון לפי קטגוריה"
      value={filters.category ?? ""}
      onChange={(e) =>
        navigate(buildIdeasHref(filters, { category: (e.target.value || null) as IdeaCategory | null }))
      }
    >
      <option value="">כל הקטגוריות</option>
      {ideaCategories.map((c) => (
        <option key={c} value={c}>
          {categoryLabels[c]}
        </option>
      ))}
    </select>
  );
}

export function SortSelect({ filters }: { filters: IdeaListFilters }) {
  const { navigate } = useFilterNavigation();
  return (
    <select
      className="inline-select"
      aria-label="מיון"
      value={filters.sort}
      onChange={(e) => navigate(buildIdeasHref(filters, { sort: e.target.value as IdeaListSort }))}
    >
      {ideaListSorts.map((s) => (
        <option key={s} value={s}>
          מיון: {ideaListSortLabels[s]}
        </option>
      ))}
    </select>
  );
}
