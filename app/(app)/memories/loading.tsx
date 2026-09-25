// שלד טעינה ל-`/memories` — כותרת, חיפוש, כותרת חודש וגריד האלבום (MemoryTile).
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-title" style={{ width: 120, height: 24 }} />
      <div className="skeleton skeleton-line" style={{ width: 150, height: 12, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 42, borderRadius: 999, marginBottom: 14 }} />
      <div className="skeleton skeleton-line" style={{ width: 90, height: 11, marginBottom: 10 }} />
      <div className="album-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="skeleton" style={{ aspectRatio: "1", borderRadius: 18, marginBottom: 6 }} />
            <div className="skeleton skeleton-line" style={{ width: "70%", height: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
