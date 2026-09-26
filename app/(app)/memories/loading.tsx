// שלד טעינה ל-`/memories` — כותרת, חיפוש, כותרת חודש וגריד האלבום (MemoryTile).
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-title" style={{ width: 120, height: 24 }} />
      <div className="skeleton skeleton-line mb-16" style={{ width: 150, height: 12 }} />
      <div className="skeleton rounded-pill mb-16" style={{ height: 42 }} />
      <div className="skeleton skeleton-line mb-12" style={{ width: 90, height: 11 }} />
      <div className="album-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="skeleton mb-8" style={{ aspectRatio: "1", borderRadius: 18 }} />
            <div className="skeleton skeleton-line" style={{ width: "70%", height: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
