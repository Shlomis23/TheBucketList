// שלד טעינה ל-`/memories/[id]` — באנר מקצה לקצה (MemoryHero) + כרטיס "איך היה".
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton mhero" style={{ borderRadius: 0 }} />
      <div className="skeleton skeleton-line" style={{ width: 130, height: 12, marginBottom: 14 }} />
      <div className="card">
        <div className="skeleton skeleton-line" style={{ width: 60, height: 12, marginBottom: 12 }} />
        <div className="skeleton skeleton-line" style={{ width: "95%", marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: "88%", marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: "60%" }} />
      </div>
    </div>
  );
}
