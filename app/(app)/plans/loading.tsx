// שלד טעינה ל-`/plans` — קבוצת כותרת + 2-3 כרטיסי תוכנית, אותה גיאומטריה
// כמו PlanCard ב-app/(app)/plans/page.tsx.
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-title" style={{ width: 100, height: 24 }} />
      <div className="skeleton skeleton-line" style={{ width: 90, height: 12, marginBottom: 8 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {[0, 1].map((i) => (
          <div key={i} className="card">
            <div className="skeleton skeleton-cover" />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <div className="skeleton skeleton-line" style={{ width: "45%", height: 16 }} />
              <div className="skeleton" style={{ width: 60, height: 20, borderRadius: "var(--radius-pill)" }} />
            </div>
            <div className="skeleton skeleton-line" style={{ width: "35%", height: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
