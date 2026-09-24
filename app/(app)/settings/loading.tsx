// שלד טעינה ל-`/settings`.
export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton skeleton-title" style={{ width: 100, height: 24 }} />
      <div className="card" style={{ marginTop: 12 }}>
        <div className="skeleton skeleton-line" style={{ width: "35%", marginBottom: 10 }} />
        <div className="skeleton skeleton-line" style={{ width: "80%" }} />
      </div>
    </div>
  );
}
