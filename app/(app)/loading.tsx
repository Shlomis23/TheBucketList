// שלד טעינה ל-`/` (בית) — אותה גיאומטריה כמו המסך: שם, תגיות, הכרטיס הגדול
// ושתי שורות של "עוד בשבילך". מציירים משהו מיד במקום מסך לבן.
export default function Loading() {
  return (
    <div className="page" style={{ paddingTop: "calc(28px + var(--safe-area-top))" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="skeleton skeleton-line" style={{ width: 96, height: 12 }} />
        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "var(--radius-pill)" }} />
      </div>
      <div className="skeleton skeleton-title" style={{ width: "55%", height: 26 }} />
      <div style={{ display: "flex", gap: 6, margin: "4px 0 14px" }}>
        <div className="skeleton" style={{ width: 78, height: 28, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 86, height: 28, borderRadius: 999 }} />
      </div>
      <div className="skeleton" style={{ height: 190, borderRadius: 22, marginBottom: 14 }} />
      <div className="skeleton skeleton-line" style={{ width: 80, height: 11, marginBottom: 10 }} />
      {[0, 1].map((i) => (
        <div key={i} className="skeleton" style={{ height: 60, borderRadius: 16, marginBottom: 8 }} />
      ))}
    </div>
  );
}
