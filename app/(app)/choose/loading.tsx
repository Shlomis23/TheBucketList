// שלד טעינה ל-`/choose` — כותרת + שורת צ'יפים (מסננים) של ChooseForm.
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-title" style={{ width: "55%", height: 24 }} />
      <div className="skeleton skeleton-line mb-8" style={{ width: "90%" }} />
      <div className="skeleton skeleton-line mb-20" style={{ width: "70%" }} />

      <div className="chip-group mb-20">
        {[64, 84, 72, 90].map((w, i) => (
          <div key={i} className="skeleton rounded-pill" style={{ width: w, height: 36 }} />
        ))}
      </div>

      <div className="skeleton rounded-pill" style={{ height: 48 }} />
    </div>
  );
}
