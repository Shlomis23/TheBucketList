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
    <div className="flex flex-col items-center gap-16 text-center"
      role="status"
      style={{ padding: "40px 16px" }}
    >
      <div className="bg-soft flex items-center justify-center"
        aria-hidden="true"
        style={{ width: 56, height: 56, borderRadius: "50%" }}
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
