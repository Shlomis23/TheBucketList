import { notFound } from "next/navigation";
import { getMemory } from "@/lib/dal/memories";
import { EditMemoryForm } from "./EditMemoryForm";
import { PageTransition } from "@/components/PageTransition";

// עריכת זיכרון `/memories/[id]/edit` — spec סעיף 13.2 (updateMemory).
export default async function EditMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memory = await getMemory(id);
  if (!memory) notFound();

  return (
    <PageTransition kind="detail">
      <div className="page">
        <p className="page-eyebrow">עריכת זיכרון</p>
        <h1 className="page-title">{memory.title}</h1>
        <div className="card mt-12">
          <EditMemoryForm memory={memory} />
        </div>
      </div>
    </PageTransition>
  );
}
