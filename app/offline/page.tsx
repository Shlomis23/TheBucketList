// ללא רשת `/offline` — spec סעיף 6, 12.
// מעטפת ציבורית בלבד — אין להציג כאן שום תוכן זוגי פרטי.
export default function OfflinePage() {
  return (
    <div className="page" style={{ textAlign: "center", paddingTop: "calc(64px + var(--safe-area-top))" }}>
      <h1 className="page-title">אין חיבור לרשת</h1>
      <p className="page-subtitle">ברגע שהחיבור יחזור, אפשר להמשיך בדיוק מאיפה שעצרתם.</p>
    </div>
  );
}
