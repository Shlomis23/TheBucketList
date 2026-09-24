// פרטי רעיון `/ideas/[id]` — F4, spec סעיף 6.
// TODO: getIdea() — תוכן, תגובתי האישית, isMatch, תגובות טקסט (ללא תגובת האחר).
export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="page">
      <h1 className="page-title">רעיון</h1>
      <p className="status-msg">מזהה: {id}</p>
    </div>
  );
}
