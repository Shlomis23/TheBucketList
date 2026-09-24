import { EmptyState } from "@/components/EmptyState";

// ארכיון `/memories` — F7, spec סעיף 6.
// TODO: listMemories() — ציר זמן, תמונה ראשית אם קיימת, חיפוש.
export default function MemoriesPage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>זיכרונות</h1>
      <EmptyState title="הזיכרון הראשון עוד לפנינו." />
    </div>
  );
}
