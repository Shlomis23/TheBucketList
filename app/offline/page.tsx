// ללא רשת `/offline` — spec סעיף 6, 12.
// מעטפת ציבורית בלבד — אין להציג כאן שום תוכן זוגי פרטי.
export default function OfflinePage() {
  return (
    <div style={{ padding: 16, textAlign: "center" }}>
      <h1>אין חיבור לרשת</h1>
      <p>ברגע שהחיבור יחזור, אפשר להמשיך בדיוק מאיפה שעצרתם.</p>
    </div>
  );
}
