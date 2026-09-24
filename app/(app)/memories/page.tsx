import { EmptyState } from "@/components/EmptyState";

// ארכיון `/memories` — F7, spec סעיף 6.
// TODO: listMemories() — ציר זמן, תמונה ראשית אם קיימת, חיפוש.
export default function MemoriesPage() {
  return (
    <div className="page">
      <h1 className="page-title">זיכרונות</h1>
      <EmptyState title="הזיכרון הראשון עוד לפנינו." />
    </div>
  );
}
