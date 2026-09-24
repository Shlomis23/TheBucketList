import { EmptyState } from "@/components/EmptyState";

// תוכניות `/plans` — spec סעיף 6.
// TODO: listPlans() — מוצעות/מאושרות/עבר, סדר כרונולוגי, מועד לא נקבע בסוף.
export default function PlansPage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>תוכניות</h1>
      <EmptyState title="עוד אין תוכנית — בחרו רעיון כדי להתחיל." />
    </div>
  );
}
