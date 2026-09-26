import type { ReactNode } from "react";

// מסך מצב אחיד — 404, שגיאה. אותו מבנה כמו offline.html (אייקון בריבוע רך,
// כותרת, הסבר, כפתורים), כדי שכל "משהו לא בסדר" ייראה חלק מהאפליקציה.
export function StatusScreen({
  icon,
  title,
  text,
  children,
}: {
  icon: "search" | "alert";
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="page status-screen">
      <div className="status-screen-icon" aria-hidden="true">
        {icon === "search" ? (
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5M8.5 11h5" />
          </svg>
        ) : (
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 2.5 19.5h19Z" />
            <path d="M12 10v4M12 17h.01" />
          </svg>
        )}
      </div>
      <h1 className="page-title" style={{ marginBottom: 8 }}>
        {title}
      </h1>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        {text}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}
