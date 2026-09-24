// תוכנית `/plans/[id]` — F6, spec סעיף 6, 7.
// TODO: getPlan() + אישורים לגרסה הנוכחית; expectedVersion בכל עריכה/אישור.
export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div style={{ padding: 16 }}>
      <h1>תוכנית</h1>
      <p>מזהה: {id}</p>
    </div>
  );
}
