// שלד טעינה ל-`/` (בית) — אותה גיאומטריה כמו המסך: שם, תגיות, הכרטיס הגדול
// ושתי שורות של "עוד בשבילך". מציירים משהו מיד במקום מסך לבן.
export default function Loading() {
  return (
    <div className="page" style={{ paddingTop: "calc(28px + var(--safe-area-top))" }}>
      <div className="flex items-center justify-between">
        <div className="skeleton skeleton-line" style={{ width: 96, height: 12 }} />
        <div className="skeleton rounded-pill" style={{ width: 32, height: 32 }} />
      </div>
      <div className="skeleton skeleton-title" style={{ width: "55%", height: 26 }} />
      <div className="flex gap-8 m-0 mt-4 mb-16">
        <div className="skeleton rounded-pill" style={{ width: 78, height: 28 }} />
        <div className="skeleton rounded-pill" style={{ width: 86, height: 28 }} />
      </div>
      <div className="skeleton mb-16" style={{ height: 190, borderRadius: 22 }} />
      <div className="skeleton skeleton-line mb-12" style={{ width: 80, height: 11 }} />
      {[0, 1].map((i) => (
        <div key={i} className="skeleton mb-8" style={{ height: 60, borderRadius: 16 }} />
      ))}
    </div>
  );
}
