// תוכנית `/plans/[id]` — F6, spec סעיף 6, 7.
// TODO: getPlan() + אישורים לגרסה הנוכחית; expectedVersion בכל עריכה/אישור.
export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="page">
      <h1 className="page-title">תוכנית</h1>
      <p className="status-msg">מזהה: {id}</p>
    </div>
  );
}
