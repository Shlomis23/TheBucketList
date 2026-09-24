import { EmptyState } from "@/components/EmptyState";

// בית `/` — ראו spec סעיף 6.
// TODO: getHome() דרך lib/dal — תוכנית קרובה, מספר מאצ'ים, מספר רעיונות,
// מצב המתנה לבן זוג. כרגע placeholder בלבד (שלב 0, לפני Auth אמיתי).
export default function HomePage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>The Bucket List</h1>
      <EmptyState title="עדיין אין כאן כלום. מה בא לכם לעשות?" />
      {/* TODO: כפתור "מה עושים?" -> /choose, כפתור "+" גלובלי -> /ideas/new */}
    </div>
  );
}
