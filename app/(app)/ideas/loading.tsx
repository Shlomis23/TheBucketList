// שלד טעינה ל-`/ideas` — כרטיסי רעיון עם אותה גיאומטריה בדיוק (תמונת עטיפה
// + כותרת + באדג'ים) כדי שלא יהיה קפיצת layout כשהדאטה האמיתית נכנסת.
export default function Loading() {
  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div className="skeleton skeleton-title" style={{ width: 110, marginBottom: 0 }} />
        <div className="skeleton" style={{ width: 84, height: 40, borderRadius: "var(--radius-pill)" }} />
      </div>

      <div className="skeleton skeleton-line" style={{ width: 140, height: 12, marginBottom: 20 }} />

      {[0, 1, 2].map((i) => (
        <div key={i} className="card idea-card">
          <div className="skeleton skeleton-cover" />
          <div className="skeleton" style={{ width: 72, height: 22, borderRadius: "var(--radius-pill)", marginBottom: 8 }} />
          <div className="skeleton skeleton-line" style={{ width: "60%", height: 16, marginBottom: 8 }} />
          <div className="skeleton skeleton-line" style={{ width: "40%", height: 12 }} />
        </div>
      ))}
    </div>
  );
}
