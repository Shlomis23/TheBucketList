import { notFound } from "next/navigation";
import { ReactionControl } from "@/components/ReactionControl";
import { getIdea } from "@/lib/dal/ideas";
import { categoryLabels, formatCostMinor, formatDurationMinutes } from "@/lib/validation/idea";

// פרטי רעיון `/ideas/[id]` — F4, spec סעיף 6.
// TODO: תגובות טקסט (addComment/editComment/deleteComment), עריכה/ארכוב.
// פריט זר/חסר מקבל את אותו 404 (notFound()) — אין הבחנה בין "לא קיים"
// ל"שייך למרחב אחר".
export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idea = await getIdea(id);
  if (!idea) notFound();

  const cost = formatCostMinor(idea.costMinor);
  const duration = formatDurationMinutes(idea.durationMinutes);

  return (
    <div className="page">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span className="badge badge-neutral">{categoryLabels[idea.category]}</span>
        {idea.isMatch && <span className="badge badge-green">מאצ&apos;!</span>}
      </div>
      <h1 className="page-title">{idea.title}</h1>
      {(cost || duration || idea.locationText) && (
        <p className="page-subtitle">{[cost, duration, idea.locationText].filter(Boolean).join(" · ")}</p>
      )}

      {idea.description && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{idea.description}</p>
        </div>
      )}

      {idea.sourceUrl && (
        <a
          href={idea.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link-plain"
          style={{ display: "inline-block", marginBottom: 16 }}
        >
          קישור לרעיון &larr;
        </a>
      )}

      <div className="card">
        <p className="page-eyebrow" style={{ marginBottom: 8 }}>
          התגובה שלי
        </p>
        <ReactionControl ideaId={idea.id} initialReaction={idea.myReaction} />
      </div>

      {/* TODO: תגובות טקסט (1-1000 תווים, גלוי לשניהם, רק המחבר עורך/מוחק) */}
    </div>
  );
}
