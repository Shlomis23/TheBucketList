import { EmptyState } from "@/components/EmptyState";

// מאגר `/ideas` — ראו spec סעיף 6, 8.
// TODO: listIdeas(cursor, search, category, myReaction, matchedOnly) דרך RLS.
export default function IdeasPage() {
  return (
    <div className="page">
      <h1 className="page-title">רעיונות</h1>
      <EmptyState title="מה הדבר הראשון שבא לכם לעשות?" />
    </div>
  );
}
