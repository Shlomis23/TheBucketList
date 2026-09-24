import { InviteConsent } from "./InviteConsent";

// הזמנה `/invite` — F2, spec סעיף 5, 6, 11.2.
// GET לא מקבל שום דבר — כל הלוגיקה (קריאת fragment, exchange) קורית בצד
// לקוח אחרי לחיצה מפורשת (InviteConsent), כך שגם link preview/bot שעושה
// רק GET לא יכול לגרום לתופעת לוואי.
export default function InvitePage() {
  return (
    <div className="page" style={{ paddingTop: "calc(48px + var(--safe-area-top))" }}>
      <p className="page-eyebrow">The Bucket List</p>
      <h1 className="page-title">הזמנה</h1>
      <InviteConsent />
    </div>
  );
}
