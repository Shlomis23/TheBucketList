// מרחב סגור `/space-closed` — F8, spec סעיף 5, 6, 11.4.
// TODO: getAccountState() — מציג סטטוס סגירה גם כש-RLS חוסמת את שאר התוכן.
// אין להציג עותק cached של המרחב.
export default function SpaceClosedPage() {
  return (
    <div className="page" style={{ paddingTop: "calc(48px + var(--safe-area-top))" }}>
      <h1 className="page-title">המרחב נסגר</h1>
      <p className="page-subtitle">פרטי הסגירה, המחיקה ואפשרויות התמיכה יופיעו כאן (שלב 1/4).</p>
    </div>
  );
}
