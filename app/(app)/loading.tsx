// שלד טעינה ל-`/` (בית) — ראו app/globals.css ".skeleton*" והתוכנית
// שאושרה לשיפור מהירות נתפסת: מציירים משהו מיידית במקום מסך לבן בזמן
// ש-Server Component מאמת session + שולף space + getHome.
export default function Loading() {
  return (
    <div className="page" style={{ paddingTop: "calc(28px + var(--safe-area-top))" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="skeleton skeleton-line" style={{ width: 96, height: 12 }} />
        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "var(--radius-pill)" }} />
      </div>
      <div className="skeleton skeleton-title" style={{ width: "70%", height: 26 }} />
      <div className="skeleton skeleton-line" style={{ width: "85%", marginBottom: 20 }} />

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ flex: 1, textAlign: "center", padding: "16px 10px" }}>
          <div className="skeleton" style={{ height: 26, width: 40, margin: "0 auto 8px" }} />
          <div className="skeleton skeleton-line" style={{ width: "70%", height: 11, margin: "0 auto" }} />
        </div>
        <div className="card" style={{ flex: 1, textAlign: "center", padding: "16px 10px" }}>
          <div className="skeleton" style={{ height: 26, width: 40, margin: "0 auto 8px" }} />
          <div className="skeleton skeleton-line" style={{ width: "70%", height: 11, margin: "0 auto" }} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="skeleton skeleton-cover" />
        <div className="skeleton skeleton-line" style={{ width: "45%", marginBottom: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: "65%" }} />
      </div>

      <div className="skeleton" style={{ height: 48, borderRadius: "var(--radius-pill)" }} />
    </div>
  );
}
