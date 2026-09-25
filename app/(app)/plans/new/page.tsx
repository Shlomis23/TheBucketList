import { notFound } from "next/navigation";
import { getIdea } from "@/lib/dal/ideas";
import { getIdeaCoverImage } from "@/lib/covers";
import { NewPlanForm } from "./NewPlanForm";

// תכנון חדש `/plans/new?ideaId=...` — F6, spec סעיף 5-6.
// מגיעים לכאן מ-/ideas/[id] ("תכננו את זה") או מ-/choose ("בואו נתכנן את זה").
// מועד/מקום/הערות/תקציב כולם אופציונליים בשלב ההצעה (spec סעיף 6.1) —
// שמירה יוצרת תוכנית (proposed) — בלי שלב אישור (25.9); בן/בת הזוג מקבלים התראה.
export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ ideaId?: string }>;
}) {
  const { ideaId } = await searchParams;
  if (!ideaId) notFound();

  const idea = await getIdea(ideaId);
  if (!idea) notFound();

  if (idea.activePlanId) {
    // כבר יש תוכנית proposed לרעיון הזה — one_active_plan_per_idea. לא נותנים
    // ליצור שנייה; ה-RPC היה חוסם בכל מקרה, אבל עדיף UX ברור מראש.
    const { redirect } = await import("next/navigation");
    redirect(`/plans/${idea.activePlanId}`);
  }

  return (
    <div className="page">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי */}
      <img src={getIdeaCoverImage(idea.category)} alt="" className="hero-banner" />
      <p className="page-eyebrow">תכנון</p>
      <h1 className="page-title">{idea.title}</h1>
      <p className="page-subtitle">כל השדות כאן אופציונליים — אפשר לשמור בלי לקבוע כלום ולמלא אחר כך.</p>
      <div className="card">
        <NewPlanForm ideaId={idea.id} />
      </div>
    </div>
  );
}
