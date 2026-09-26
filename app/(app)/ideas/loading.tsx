// שלד טעינה ל-`/ideas` — אותה גיאומטריה כמו השורה הקומפקטית (IdeaRow):
// תמונה 64px בצד, כותרת + פרטים, ושורת גלולות תגובה — כדי שלא תהיה קפיצת
// layout כשהדאטה האמיתית נכנסת.
export default function Loading() {
  return (
    <div className="page">
      <div className="flex items-center justify-between mb-12">
        <div className="skeleton skeleton-title mb-0" style={{ width: 110 }} />
        <div className="skeleton rounded-pill" style={{ width: 84, height: 40 }} />
      </div>

      <div className="skeleton mb-12" style={{ height: 42 }} />
      <div className="flex gap-8 mb-16">
        {[48, 104, 76, 112].map((w, i) => (
          <div key={i} className="skeleton rounded-pill" style={{ width: w, height: 36 }} />
        ))}
      </div>

      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="card idea-row">
          <div className="skeleton idea-row-thumb-link" style={{ width: 64, height: 64 }} />
          <div>
            <div className="skeleton skeleton-line mb-8" style={{ width: "60%", height: 15 }} />
            <div className="skeleton skeleton-line" style={{ width: "45%", height: 11 }} />
          </div>
          <div className="flex gap-8">
            {[0, 1, 2].map((j) => (
              <div key={j} className="skeleton rounded-pill" style={{ width: 52, height: 36 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
