import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { ReactionControl } from "@/components/ReactionControl";
import { listIdeas } from "@/lib/dal/ideas";
import { categoryLabels, formatCostMinor, formatDurationMinutes } from "@/lib/validation/idea";
import { getIdeaCoverImage } from "@/lib/covers";

// מאגר `/ideas` — spec סעיף 6, 8. `?status=archived` מציג את הארכיון
// (ראו lib/dal/ideas.ts) — כפתור/מסנן פעילים/ארכיון, לא מסך נפרד, כדי
// שהניווט התחתון יישאר 4 טאבים כמו שהוחלט.
// TODO (המשך F3): חיפוש, פילטר קטגוריה/מאצ'ים/תגובה שלי, מיון, pagination.
export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const showArchived = status === "archived";
  const ideas = await listIdeas(showArchived ? "archived" : "active");

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          רעיונות
        </h1>
        {!showArchived && (
          <Link href="/ideas/new" className="btn btn-primary" style={{ padding: "0 18px", minHeight: 40 }}>
            + רעיון
          </Link>
        )}
      </div>

      <div className="chip-group" role="group" aria-label="פעילים או בארכיון" style={{ marginBottom: 12 }}>
        <Link href="/ideas" className="chip" aria-current={!showArchived ? "page" : undefined}>
          פעילים
        </Link>
        <Link href="/ideas?status=archived" className="chip" aria-current={showArchived ? "page" : undefined}>
          בארכיון
        </Link>
      </div>

      {!showArchived && <p className="page-subtitle">{ideas.length} רעיונות פתוחים</p>}

      {ideas.length === 0 ? (
        showArchived ? (
          <EmptyState title="עוד אין רעיונות בארכיון." />
        ) : (
          <EmptyState
            title="מה הדבר הראשון שבא לכם לעשות?"
            action={
              <Link href="/ideas/new" className="btn btn-primary">
                הוספת רעיון
              </Link>
            }
          />
        )
      ) : (
        ideas.map((idea) => {
          const cost = formatCostMinor(idea.costMinor);
          const duration = formatDurationMinutes(idea.durationMinutes);
          return (
            <div key={idea.id} className="card idea-card">
              <Link href={`/ideas/${idea.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי */}
                <img src={getIdeaCoverImage(idea.category)} alt="" className="card-cover-img cover-sm" />
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span className="badge badge-neutral">{categoryLabels[idea.category]}</span>
                  {idea.isMatch && <span className="badge badge-green">מאצ&apos;!</span>}
                </div>
                <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 16 }}>{idea.title}</p>
                {(cost || duration || idea.locationText) && (
                  <p className="status-msg" style={{ margin: "0 0 10px", fontSize: 13 }}>
                    {[cost, duration, idea.locationText].filter(Boolean).join(" · ")}
                  </p>
                )}
              </Link>
              {!showArchived && <ReactionControl ideaId={idea.id} initialReaction={idea.myReaction} />}
            </div>
          );
        })
      )}
    </div>
  );
}
