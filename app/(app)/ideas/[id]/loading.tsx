// שלד טעינה ל-`/ideas/[id]` — hero + כותרת + באדג'ים + כרטיס תגובות,
// אותה גיאומטריה כמו app/(app)/ideas/[id]/page.tsx.
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-cover skeleton-hero" />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div className="skeleton" style={{ width: 72, height: 22, borderRadius: "var(--radius-pill)" }} />
        <div className="skeleton" style={{ width: 58, height: 22, borderRadius: "var(--radius-pill)" }} />
      </div>
      <div className="skeleton skeleton-title" style={{ width: "75%", height: 24 }} />
      <div className="skeleton skeleton-line" style={{ width: "50%", marginBottom: 20 }} />

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="skeleton skeleton-line" style={{ width: "40%", marginBottom: 12 }} />
        <div className="skeleton skeleton-line" style={{ width: "90%", marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: "80%" }} />
      </div>

      <div className="skeleton" style={{ height: 48, borderRadius: "var(--radius-pill)" }} />
    </div>
  );
}
