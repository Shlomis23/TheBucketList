// שלד טעינה ל-`/ideas` — אותה גיאומטריה כמו השורה הקומפקטית (IdeaRow):
// תמונה 64px בצד, כותרת + פרטים, ושורת גלולות תגובה — כדי שלא תהיה קפיצת
// layout כשהדאטה האמיתית נכנסת.
export default function Loading() {
  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="skeleton skeleton-title" style={{ width: 110, marginBottom: 0 }} />
        <div className="skeleton" style={{ width: 84, height: 40, borderRadius: "var(--radius-pill)" }} />
      </div>

      <div className="skeleton" style={{ height: 42, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[48, 104, 76, 112].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: w, height: 36, borderRadius: "var(--radius-pill)" }} />
        ))}
      </div>

      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="card idea-row">
          <div className="skeleton idea-row-thumb-link" style={{ width: 64, height: 64 }} />
          <div>
            <div className="skeleton skeleton-line" style={{ width: "60%", height: 15, marginBottom: 6 }} />
            <div className="skeleton skeleton-line" style={{ width: "45%", height: 11 }} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((j) => (
              <div key={j} className="skeleton" style={{ width: 52, height: 36, borderRadius: "var(--radius-pill)" }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
