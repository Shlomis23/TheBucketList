// זיכרון `/memories/[id]` — spec סעיף 6, 11.3.
// TODO: getMemory() — טקסט + photo IDs בלבד; תמונות דרך /api/photos/[id]/content.
export default async function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="page">
      <h1 className="page-title">זיכרון</h1>
      <p className="status-msg">מזהה: {id}</p>
    </div>
  );
}
