// שלד טעינה ל-`/settings` — שלושה כרטיסים: השם שלי, בן/בת הזוג, יציאה.
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-title" style={{ width: 100, height: 24 }} />
      {[
        [42, 88],
        [0, 80],
        [0, 48],
      ].map(([input, w], i) => (
        <div key={i} className="card mt-12">
          <div className="skeleton skeleton-line mb-12" style={{ width: "30%" }} />
          {input > 0 && <div className="skeleton mb-12" style={{ height: input }} />}
          <div className="skeleton skeleton-line" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}
