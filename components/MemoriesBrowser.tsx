"use client";

import { useMemo, useState } from "react";
import type { MemoryDto } from "@/lib/dal/memories";
import { MemoryCard } from "@/components/MemoryCard";
import { categoryLabels, ideaCategories, type IdeaCategory } from "@/lib/validation/idea";
import { formatMemoryMonth, MEMORY_SEARCH_MAX, memoryMatches } from "@/lib/validation/memory";

// ציר הזמן של /memories עם חיפוש וסינון לפי קטגוריה (26.9).
// הסינון בדפדפן (כל הזיכרונות כבר כאן) — מיידי, בלי רענון. החיפוש נשמר ב-URL
// (replaceState, בלי רשומות היסטוריה) כדי שכניסה לזיכרון וחזרה אחורה
// יחזירו לאותן תוצאות.

function syncUrl(q: string, category: IdeaCategory | null) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  const qs = params.toString();
  window.history.replaceState(null, "", qs ? `/memories?${qs}` : "/memories");
}

export function MemoriesBrowser({
  memories,
  initialQuery,
  initialCategory,
}: {
  memories: MemoryDto[];
  initialQuery: string;
  initialCategory: IdeaCategory | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<IdeaCategory | null>(initialCategory);

  // רק קטגוריות שיש בהן זיכרונות, בסדר הקבוע של האפליקציה.
  const presentCategories = useMemo(() => {
    const present = new Set(memories.map((m) => m.category).filter(Boolean));
    return ideaCategories.filter((c) => present.has(c));
  }, [memories]);

  const filtered = useMemo(
    () =>
      memories.filter(
        (m) =>
          (!category || m.category === category) &&
          memoryMatches(
            {
              title: m.title,
              story: m.story,
              place: m.place,
              happenedOn: m.happenedOn,
              categoryLabel: m.category ? categoryLabels[m.category] : null,
            },
            query,
          ),
      ),
    [memories, query, category],
  );

  // קיבוץ לפי חודש, תוך שמירה על הסדר מה-DAL (happened_on יורד).
  const groups = useMemo(() => {
    const out: { month: string; items: MemoryDto[] }[] = [];
    for (const m of filtered) {
      const month = formatMemoryMonth(m.happenedOn);
      const last = out[out.length - 1];
      if (last && last.month === month) last.items.push(m);
      else out.push({ month, items: [m] });
    }
    return out;
  }, [filtered]);

  const isFiltering = query.trim() !== "" || category !== null;
  const showControls = memories.length >= 2;

  function clear() {
    setQuery("");
    setCategory(null);
    syncUrl("", null);
  }

  return (
    <>
      <p className="page-subtitle" style={{ marginBottom: 14 }} aria-live="polite">
        {isFiltering && filtered.length > 0
          ? `${filtered.length} מתוך ${memories.length} זיכרונות`
          : memories.length === 1
            ? "חוויה אחת שעשיתם יחד"
            : `${memories.length} חוויות שעשיתם יחד`}
      </p>

      {showControls && (
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            (document.activeElement as HTMLElement | null)?.blur(); // סוגר את המקלדת בטלפון
          }}
          style={{ display: "flex", gap: 8, marginBottom: 14 }}
        >
          <input
            type="search"
            className="input"
            placeholder="חיפוש: מקום, מילה, חודש"
            aria-label="חיפוש בזיכרונות"
            enterKeyHint="search"
            maxLength={MEMORY_SEARCH_MAX}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              syncUrl(e.target.value.trim(), category);
            }}
            style={{ minHeight: 42, flex: 1, minWidth: 0 }}
          />
          {presentCategories.length >= 2 && (
            <select
              className={category ? "chip chip-select is-set" : "chip chip-select"}
              aria-label="סינון לפי קטגוריה"
              value={category ?? ""}
              onChange={(e) => {
                const next = (e.target.value || null) as IdeaCategory | null;
                setCategory(next);
                syncUrl(query.trim(), next);
              }}
              style={{ minHeight: 42, flex: "none" }}
            >
              <option value="">הכול</option>
              {presentCategories.map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c]}
                </option>
              ))}
            </select>
          )}
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700 }}>
            {query.trim() ? `לא מצאנו זיכרון עם "${query.trim()}"` : "אין זיכרונות בקטגוריה הזו"}
          </p>
          <p className="status-msg" style={{ margin: "0 0 12px", fontSize: 13 }}>
            אפשר לחפש לפי מקום, מילה מהסיפור או חודש.
          </p>
          <button type="button" className="link-plain" onClick={clear}>
            ניקוי החיפוש
          </button>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.month} aria-label={g.month} style={{ marginBottom: 8 }}>
            <p className="page-eyebrow" style={{ color: "var(--color-muted)", margin: "4px 0 8px" }}>
              {g.month}
            </p>
            {g.items.map((m) => (
              <MemoryCard key={m.id} memory={m} />
            ))}
          </section>
        ))
      )}
    </>
  );
}
