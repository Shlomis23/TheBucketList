import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { ReactionControl } from "@/components/ReactionControl";
import { listIdeas } from "@/lib/dal/ideas";
import { categoryLabels, formatCostMinor, formatDurationMinutes } from "@/lib/validation/idea";

// מאגר `/ideas` — spec סעיף 6, 8.
// TODO (המשך F3): חיפוש, פילטר קטגוריה/מאצ'ים/תגובה שלי, מיון, pagination.
export default async function IdeasPage() {
  const ideas = await listIdeas();

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          רעיונות
        </h1>
        <Link href="/ideas/new" className="btn btn-primary" style={{ padding: "0 18px", minHeight: 40 }}>
          + רעיון
        </Link>
      </div>
      <p className="page-subtitle">{ideas.length} רעיונות פתוחים</p>

      {ideas.length === 0 ? (
        <EmptyState
          title="מה הדבר הראשון שבא לכם לעשות?"
          action={
            <Link href="/ideas/new" className="btn btn-primary">
              הוספת רעיון
            </Link>
          }
        />
      ) : (
        ideas.map((idea) => {
          const cost = formatCostMinor(idea.costMinor);
          const duration = formatDurationMinutes(idea.durationMinutes);
          return (
            <div key={idea.id} className="card idea-card">
              <Link href={`/ideas/${idea.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span className="badge badge-neutral">{categoryLabels[idea.category]}</span>
                </div>
                <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 16 }}>{idea.title}</p>
                {(cost || duration || idea.locationText) && (
                  <p className="status-msg" style={{ margin: "0 0 10px", fontSize: 13 }}>
                    {[cost, duration, idea.locationText].filter(Boolean).join(" · ")}
                  </p>
                )}
              </Link>
              <ReactionControl ideaId={idea.id} initialReaction={idea.myReaction} />
            </div>
          );
        })
      )}
    </div>
  );
}
