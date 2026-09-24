import { notFound, redirect } from "next/navigation";
import { getIdea } from "@/lib/dal/ideas";
import { EditIdeaForm } from "./EditIdeaForm";

// עריכת רעיון קיים `/ideas/[id]/edit` — F4, שלושת הדברים שאושרו ב-24.9.
// רעיון בארכיון לא נטען כאן — עריכה רלוונטית רק לרעיון פעיל; אין קישור
// אליו מהארכיון (ראו app/(app)/ideas/[id]/page.tsx), אבל אם מגיעים לכאן
// בכל זאת (למשל URL ישן) מחזירים ל-/ideas/[id] במקום 404 מבלבל.
export default async function EditIdeaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idea = await getIdea(id);
  if (!idea) notFound();
  if (idea.status === "archived") redirect(`/ideas/${id}`);

  return (
    <div className="page">
      <h1 className="page-title">עריכת רעיון</h1>
      <div className="card">
        <EditIdeaForm idea={idea} />
      </div>
    </div>
  );
}
