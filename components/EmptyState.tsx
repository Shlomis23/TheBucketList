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
        gap: 12,
        padding: "48px 16px",
        textAlign: "center",
        color: "var(--color-muted)",
      }}
    >
      <p>{title}</p>
      {action}
    </div>
  );
}
