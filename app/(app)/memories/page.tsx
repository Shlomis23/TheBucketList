import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { listMemories } from "@/lib/dal/memories";
import { MemoriesBrowser } from "@/components/MemoriesBrowser";
import { ideaCategories, type IdeaCategory } from "@/lib/validation/idea";
import { MEMORY_SEARCH_MAX } from "@/lib/validation/memory";

// ארכיון `/memories` — F7, spec סעיף 6: ציר זמן, מקובץ לפי חודש, החדש למעלה.
// חיפוש וסינון לפי קטגוריה (26.9) — בדפדפן, ראו components/MemoriesBrowser.
// ?q= ו-?category= רק לשחזור אחרי "אחורה"; הסינון עצמו לא עובר בשרת.
export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}) {
  const [memories, params] = await Promise.all([listMemories(), searchParams]);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = (first(params.q) ?? "").slice(0, MEMORY_SEARCH_MAX);
  const rawCategory = first(params.category);
  const category = ideaCategories.includes(rawCategory as IdeaCategory) ? (rawCategory as IdeaCategory) : null;

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

  return (
    <div className="page">
      <h1 className="page-title">זיכרונות</h1>
      <MemoriesBrowser memories={memories} initialQuery={q} initialCategory={category} />
    </div>
  );
}
