import Link from "next/link";
import { notFound } from "next/navigation";
import { ReactionControl } from "@/components/ReactionControl";
import { ArchiveIdeaButton } from "@/components/ArchiveIdeaButton";
import { getIdea } from "@/lib/dal/ideas";
import { listComments } from "@/lib/dal/comments";
import { IdeaConversation } from "@/components/IdeaConversation";
import { categoryLabels, formatCostMinor, formatDurationMinutes, reactionLabels, reactionBadgeClass } from "@/lib/validation/idea";
import { getIdeaCoverImage } from "@/lib/covers";

// פרטי רעיון `/ideas/[id]` — F4, spec סעיף 6.
// תגובות טקסט: IdeaConversation (0017). בארכיון — קריאה בלבד.
// פריט זר/חסר מקבל את אותו 404 (notFound()) — אין הבחנה בין "לא קיים"
// ל"שייך למרחב אחר". רעיון בארכיון עדיין נטען כאן (getIdea לא מסנן status) —
// כדי לאפשר שחזור — אבל בלי תגובה/תכנון/עריכה פעילים.
export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // השיחה נטענת במקביל לרעיון (לא תלויה בו) — בלי קפיצת רשת נוספת.
  // אם הרעיון זר/חסר, RLS מחזיר רשימה ריקה ו-notFound() קורה ממילא.
  const [idea, comments] = await Promise.all([getIdea(id), listComments(id)]);
  if (!idea) notFound();

  const cost = formatCostMinor(idea.costMinor);
  const duration = formatDurationMinutes(idea.durationMinutes);
  const isArchived = idea.status === "archived";

  return (
    <div className="page">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי */}
      <img src={getIdeaCoverImage(idea.category)} alt="" className="hero-banner" />
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span className="badge badge-neutral">{categoryLabels[idea.category]}</span>
        {idea.isMatch && <span className="badge badge-green">מאצ&apos;!</span>}
        {isArchived && <span className="badge badge-neutral">בארכיון</span>}
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

      {isArchived ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="status-msg" style={{ marginBottom: 12 }}>
            הרעיון הזה בארכיון — אי אפשר להגיב עליו או לתכנן אותו כל עוד הוא שם.
          </p>
          <ArchiveIdeaButton ideaId={idea.id} version={idea.version} mode="restore" />
        </div>
      ) : null}

      {/* בארכיון: השיחה נשארת גלויה לקריאה, בלי כתיבה/עריכה (כמו תגובות רצון). */}
      {isArchived ? (
        comments.length > 0 && <IdeaConversation ideaId={idea.id} comments={comments} canPost={false} />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="page-eyebrow" style={{ marginBottom: 8 }}>
              התגובה שלי
            </p>
            <ReactionControl ideaId={idea.id} initialReaction={idea.myReaction} />
          </div>

          {idea.reactions.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <p className="page-eyebrow" style={{ marginBottom: 8 }}>
                התגובות של שנינו
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {idea.reactions.map((r) => (
                  <div
                    key={r.userId}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <span style={{ fontWeight: 700 }}>{r.displayName}</span>
                    {r.preference ? (
                      <span className={`badge ${reactionBadgeClass[r.preference]}`}>
                        {reactionLabels[r.preference]}
                      </span>
                    ) : (
                      <span className="badge badge-neutral">עדיין לא הגיב/ה</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <IdeaConversation ideaId={idea.id} comments={comments} canPost />

          <Link
            href={`/ideas/${idea.id}/edit`}
            className="link-plain"
            style={{ display: "inline-block", marginBottom: 16 }}
          >
            עריכת הרעיון
          </Link>

          {idea.activePlanId ? (
            <Link href={`/plans/${idea.activePlanId}`} className="btn btn-block" style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", marginBottom: 16 }}>
              כבר יש תוכנית לרעיון הזה &larr;
            </Link>
          ) : (
            <Link href={`/plans/new?ideaId=${idea.id}`} className="btn btn-primary btn-block" style={{ marginBottom: 16 }}>
              תכננו את זה
            </Link>
          )}

          <ArchiveIdeaButton
            ideaId={idea.id}
            version={idea.version}
            mode="archive"
            blockedByActivePlan={Boolean(idea.activePlanId)}
          />
        </>
      )}
    </div>
  );
}
