// פרטי רעיון `/ideas/[id]` — F4, spec סעיף 6.
// TODO: getIdea() — תוכן, תגובתי האישית, isMatch, תגובות טקסט (ללא תגובת האחר).
export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div style={{ padding: 16 }}>
      <h1>רעיון</h1>
      <p>מזהה: {id}</p>
    </div>
  );
}
