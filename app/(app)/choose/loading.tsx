// שלד טעינה ל-`/choose` — כותרת + שורת צ'יפים (מסננים) של ChooseForm.
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-title" style={{ width: "55%", height: 24 }} />
      <div className="skeleton skeleton-line" style={{ width: "90%", marginBottom: 8 }} />
      <div className="skeleton skeleton-line" style={{ width: "70%", marginBottom: 20 }} />

      <div className="chip-group" style={{ marginBottom: 20 }}>
        {[64, 84, 72, 90].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: w, height: 36, borderRadius: "var(--radius-pill)" }} />
        ))}
      </div>

      <div className="skeleton" style={{ height: 48, borderRadius: "var(--radius-pill)" }} />
    </div>
  );
}
