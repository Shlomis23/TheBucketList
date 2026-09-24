// שלד טעינה ל-`/memories` — כותרת חודש + כרטיסי זיכרון (תמונה + תאריך +
// כותרת + שתי שורות), אותה גיאומטריה כמו MemoryCard.
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-title" style={{ width: 120, height: 24 }} />
      <div className="skeleton skeleton-line" style={{ width: 150, height: 12, marginBottom: 18 }} />
      <div className="skeleton skeleton-line" style={{ width: 90, height: 11, marginBottom: 10 }} />
      {[0, 1].map((i) => (
        <div key={i} className="card" style={{ marginBottom: 10 }}>
          <div className="skeleton skeleton-cover" />
          <div className="skeleton skeleton-line" style={{ width: 110, height: 11, marginBottom: 6 }} />
          <div className="skeleton skeleton-line" style={{ width: "55%", height: 16, marginBottom: 8 }} />
          <div className="skeleton skeleton-line" style={{ width: "90%", height: 12, marginBottom: 6 }} />
          <div className="skeleton skeleton-line" style={{ width: "70%", height: 12 }} />
        </div>
      ))}
    </div>
  );
}
