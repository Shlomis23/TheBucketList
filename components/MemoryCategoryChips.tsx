"use client";

import { ideaCategories, categoryLabels, type IdeaCategory } from "@/lib/validation/idea";

// בחירת קטגוריה לזיכרון — אופציונלית: לחיצה נוספת על הנבחרת מבטלת אותה.
export function MemoryCategoryChips({
  value,
  onChange,
}: {
  value: IdeaCategory | null;
  onChange: (next: IdeaCategory | null) => void;
}) {
  return (
    <div className="chip-group" role="group" aria-label="קטגוריה">
      {ideaCategories.map((c) => (
        <button
          key={c}
          type="button"
          className="chip"
          aria-pressed={value === c}
          onClick={() => onChange(value === c ? null : c)}
        >
          {categoryLabels[c]}
        </button>
      ))}
    </div>
  );
}
