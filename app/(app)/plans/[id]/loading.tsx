// שלד טעינה ל-`/plans/[id]` — hero + סטטוס + כרטיס פרטים, אותה גיאומטריה
// כמו PlanDetail.tsx.
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-cover skeleton-hero" />
      <div className="skeleton" style={{ width: 90, height: 22, borderRadius: "var(--radius-pill)", marginBottom: 12 }} />
      <div className="skeleton skeleton-title" style={{ width: "70%", height: 24 }} />
      <div className="skeleton skeleton-line" style={{ width: "50%", marginBottom: 20 }} />

      <div className="card">
        <div className="skeleton skeleton-line" style={{ width: "40%", marginBottom: 12 }} />
        <div className="skeleton skeleton-line" style={{ width: "80%", marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: "60%" }} />
      </div>
    </div>
  );
}
