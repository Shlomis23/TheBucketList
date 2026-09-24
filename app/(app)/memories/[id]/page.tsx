// זיכרון `/memories/[id]` — spec סעיף 6, 11.3.
// TODO: getMemory() — טקסט + photo IDs בלבד; תמונות דרך /api/photos/[id]/content.
export default async function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div style={{ padding: 16 }}>
      <h1>זיכרון</h1>
      <p>מזהה: {id}</p>
    </div>
  );
}
