// שלד טעינה ל-`/plans/[id]` — hero + סטטוס + כרטיס פרטים, אותה גיאומטריה
// כמו PlanDetail.tsx.
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-cover skeleton-hero" />
      <div className="skeleton rounded-pill mb-12" style={{ width: 90, height: 22 }} />
      <div className="skeleton skeleton-title" style={{ width: "70%", height: 24 }} />
      <div className="skeleton skeleton-line mb-20" style={{ width: "50%" }} />

      <div className="card">
        <div className="skeleton skeleton-line mb-12" style={{ width: "40%" }} />
        <div className="skeleton skeleton-line mb-8" style={{ width: "80%" }} />
        <div className="skeleton skeleton-line" style={{ width: "60%" }} />
      </div>
    </div>
  );
}
