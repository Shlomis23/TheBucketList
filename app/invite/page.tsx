// הזמנה `/invite` — F2, spec סעיף 5, 6, 11.2.
// TODO (קריטי לאבטחה): קריאת #token מה-fragment בצד לקוח בלבד, ניקוי מיידי
// עם history.replaceState, ואז POST same-origin ל-/api/invitations/exchange
// כדי להחליף אותו ב-cookie זמני. GET אף פעם לא מקבל הזמנה.
export default function InvitePage() {
  return (
    <div className="page" style={{ paddingTop: "calc(48px + var(--safe-area-top))" }}>
      <h1 className="page-title">הזמנה</h1>
      <p className="page-subtitle">מסך ההסכמה להצטרפות למרחב הזוגי יגיע כאן (שלב 1).</p>
    </div>
  );
}
