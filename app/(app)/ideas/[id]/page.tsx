import Link from "next/link";
import { notFound } from "next/navigation";
import { ReactionControl } from "@/components/ReactionControl";
import { ArchiveIdeaButton } from "@/components/ArchiveIdeaButton";
import { getIdea } from "@/lib/dal/ideas";
import { listComments } from "@/lib/dal/comments";
import { IdeaConversation } from "@/components/IdeaConversation";
import { categoryLabels, formatCostMinor, formatDurationMinutes, reactionLabels, reactionBadgeClass } from "@/lib/validation/idea";
import { CoverImg } from "@/components/CoverImg";
import { BackButton } from "@/components/BackButton";
import { linkHost } from "@/lib/validation/comment";
import { NavigateTile } from "@/components/NavigateTile";
import { getUnreadConversations, markIdeaRead } from "@/lib/dal/conversations";
import { RefreshAfterRead } from "@/components/RefreshAfterRead";

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
  // "לא נקרא" (0026): הכניסה לדף מסמנת את השיחה כנקראה — רק אם באמת היה
  // בה משהו חדש (unread נקרא במקביל, בלי קפיצת רשת נוספת). ואז גם מנקים את
  // המסכים השמורים בטלפון (RefreshAfterRead), אחרת "הודעה חדשה" נשארת בבית.
  const [idea, comments, unread] = await Promise.all([getIdea(id), listComments(id), getUnreadConversations()]);
  if (!idea) notFound();
  const hadUnread = unread.some((u) => u.ideaId === id);
  if (hadUnread) await markIdeaRead(id).catch(() => {});

  const cost = formatCostMinor(idea.costMinor);
  const duration = formatDurationMinutes(idea.durationMinutes);
  const isArchived = idea.status === "archived";

  return (
    <div className="page">
      {hadUnread && <RefreshAfterRead />}
      <div className="hero-wrap">
        <CoverImg category={idea.category} className="hero-banner" />
        <BackButton fallback="/ideas" />
      </div>
      <div className="flex gap-8 items-center mb-8">
        <span className="badge badge-neutral">{categoryLabels[idea.category]}</span>
        {idea.isMatch && <span className="badge badge-green">מאצ&apos;!</span>}
        {isArchived && <span className="badge badge-neutral">בארכיון</span>}
      </div>
      <h1 className="page-title">{idea.title}</h1>
      {/* המקום לא כאן — הוא באריח "ניווט" למטה (בלי כפילות). */}
      {(cost || duration) && <p className="page-subtitle">{[cost, duration].filter(Boolean).join(" · ")}</p>}

      {idea.description && (
        <div className="card mb-16">
          <p className="m-0 pre-wrap leading-relaxed">{idea.description}</p>
        </div>
      )}

      {/* "קישור לרעיון" בלבל — אנחנו כבר בתוך הרעיון (25.9). אותו סגנון כמו
          בכרטיס "מהרעיון" בדף התוכנית: "פתיחת הקישור" + שם האתר מתחת. */}
      {idea.sourceUrl && (
        <a
          href={idea.sourceUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="link-tile primary"
          style={{ marginBottom: idea.locationText ? 8 : 16 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
          <span className="link-tile-text flex flex-col" style={{ whiteSpace: "normal" }}>
            <span>פתיחת הקישור</span>
            <span className="text-right text-xs fw-600 c-muted"
              dir="ltr"
              style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {linkHost(idea.sourceUrl)}
            </span>
          </span>
        </a>
      )}

      {idea.locationText && (
        <NavigateTile place={idea.locationText} placeId={idea.placeId} className="mb-16" />
      )}

      {isArchived ? (
        <div className="card mb-16">
          <p className="status-msg mb-12">
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
          <div className="card mb-16">
            <p className="page-eyebrow mb-8">
              התגובה שלי
            </p>
            <ReactionControl ideaId={idea.id} initialReaction={idea.myReaction} />
          </div>

          {idea.reactions.length > 0 && (
            <div className="card mb-16">
              <p className="page-eyebrow mb-8">
                התגובות של שנינו
              </p>
              <div className="flex flex-col gap-12">
                {idea.reactions.map((r) => (
                  <div className="flex items-center justify-between"
                    key={r.userId}
                  >
                    <span className="fw-700">{r.displayName}</span>
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
            className="link-plain inline-block mb-16"
          >
            עריכת הרעיון
          </Link>

          {idea.activePlanId ? (
            <Link href={`/plans/${idea.activePlanId}`} className="btn btn-block bg-soft c-primary mb-16">
              כבר יש תוכנית לרעיון הזה &larr;
            </Link>
          ) : (
            <Link href={`/plans/new?ideaId=${idea.id}`} className="btn btn-primary btn-block mb-16">
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
