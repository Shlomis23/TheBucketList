import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { listMemories, type MemoryDto } from "@/lib/dal/memories";
import { formatMemoryMonth } from "@/lib/validation/memory";
import { MemoryCard } from "@/components/MemoryCard";

// ארכיון `/memories` — F7, spec סעיף 6: ציר זמן, מקובץ לפי חודש, החדש למעלה.
// חיפוש נדחה בכוונה (החלטה מ-25.9) עד שיהיו עשרות זיכרונות; תמונה ראשית
// תגיע עם שלב התמונות — בינתיים תמונת העיצוב של הקטגוריה.
export default async function MemoriesPage() {
  const memories = await listMemories();

  if (memories.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">זיכרונות</h1>
        <EmptyState
          title="הזיכרון הראשון עוד לפנינו."
          action={
            <Link href="/plans" className="btn btn-primary">
              לתוכניות
            </Link>
          }
        />
      </div>
    );
  }

  // קיבוץ לפי חודש, תוך שמירה על הסדר שכבר הגיע מה-DAL (happened_on יורד).
  const groups: { month: string; items: MemoryDto[] }[] = [];
  for (const m of memories) {
    const month = formatMemoryMonth(m.happenedOn);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(m);
    else groups.push({ month, items: [m] });
  }

  return (
    <div className="page">
      <h1 className="page-title">זיכרונות</h1>
      <p className="page-subtitle" style={{ marginBottom: 14 }}>
        {memories.length === 1 ? "חוויה אחת שעשיתם יחד" : `${memories.length} חוויות שעשיתם יחד`}
      </p>

      {groups.map((g) => (
        <section key={g.month} aria-label={g.month} style={{ marginBottom: 8 }}>
          <p className="page-eyebrow" style={{ color: "var(--color-muted)", margin: "4px 0 8px" }}>
            {g.month}
          </p>
          {g.items.map((m) => (
            <MemoryCard key={m.id} memory={m} />
          ))}
        </section>
      ))}
    </div>
  );
}
