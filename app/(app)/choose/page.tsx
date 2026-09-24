import { EmptyState } from "@/components/EmptyState";

// בחירה `/choose` — מנוע הבחירה, spec סעיף 5 (F5) ו-8.
// TODO: chooseExperience(filters, excludedIds) — read-only, אלגוריתם סעיף 8.2 בדיוק.
export default function ChoosePage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>מה עושים?</h1>
      <EmptyState title="אין עדיין מועמדים — הרחיבו תנאים או בחרו מכל הרעיונות." />
    </div>
  );
}
