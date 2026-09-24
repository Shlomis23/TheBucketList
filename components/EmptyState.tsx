// רכיב משותף למצבי Empty — טקסט חם, לא שיפוטי, בלי "0" גולמי.
// ראו docs/The-Bucket-List-Technical-Spec-HE.md סעיף 4, 6.
export function EmptyState({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        padding: "40px 16px",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--color-primary-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21c4-3.5 8-7.1 8-11.2A5.3 5.3 0 0 0 12 6a5.3 5.3 0 0 0-8 3.8C4 13.9 8 17.5 12 21Z" />
        </svg>
      </div>
      <p className="status-msg">{title}</p>
      {action}
    </div>
  );
}
