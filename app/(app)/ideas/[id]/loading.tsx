// שלד טעינה ל-`/ideas/[id]` — hero + כותרת + באדג'ים + כרטיס תגובות,
// אותה גיאומטריה כמו app/(app)/ideas/[id]/page.tsx.
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-cover skeleton-hero" />
      <div className="flex gap-8 mb-12">
        <div className="skeleton rounded-pill" style={{ width: 72, height: 22 }} />
        <div className="skeleton rounded-pill" style={{ width: 58, height: 22 }} />
      </div>
      <div className="skeleton skeleton-title" style={{ width: "75%", height: 24 }} />
      <div className="skeleton skeleton-line mb-20" style={{ width: "50%" }} />

      <div className="card mb-12">
        <div className="skeleton skeleton-line mb-12" style={{ width: "40%" }} />
        <div className="skeleton skeleton-line mb-8" style={{ width: "90%" }} />
        <div className="skeleton skeleton-line" style={{ width: "80%" }} />
      </div>

      <div className="skeleton rounded-pill" style={{ height: 48 }} />
    </div>
  );
}
