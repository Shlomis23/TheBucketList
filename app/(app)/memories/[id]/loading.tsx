// שלד טעינה ל-`/memories/[id]` — hero + תאריך + כותרת + כרטיס "איך היה".
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-cover skeleton-hero" />
      <div className="skeleton skeleton-line" style={{ width: 150, height: 12, marginBottom: 10 }} />
      <div className="skeleton skeleton-title" style={{ width: "65%", height: 24 }} />
      <div className="skeleton skeleton-line" style={{ width: 130, height: 12, marginBottom: 18 }} />
      <div className="card">
        <div className="skeleton skeleton-line" style={{ width: 60, height: 12, marginBottom: 12 }} />
        <div className="skeleton skeleton-line" style={{ width: "95%", marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: "88%", marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: "60%" }} />
      </div>
    </div>
  );
}
