import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { ReactionControl } from "@/components/ReactionControl";
import { CategorySelect, IdeaSearch, SortSelect } from "@/components/IdeaFilterControls";
import { listIdeas, type IdeaListItemDto, type IdeaListCounts } from "@/lib/dal/ideas";
import { categoryLabels, formatCostMinor, formatDurationMinutes } from "@/lib/validation/idea";
import {
  buildIdeasHref,
  hasNarrowingFilter,
  parseIdeaListParams,
  ideaStatusTag,
  type IdeaListFilters,
} from "@/lib/validation/ideaList";
import { getPartnerName } from "@/lib/dal/profile";
import { getMySpaceId, hasPartner } from "@/lib/dal/space";
import { getIdeaCoverImage } from "@/lib/covers";

// מאגר `/ideas` — spec סעיף 6: חיפוש, פילטר קטגוריה/מאצ'ים/תגובה שלי, מיון.
// כל הסינון ב-URL (ראו lib/validation/ideaList.ts) ומבוצע בשרת ב-listIdeas.
// `?status=archived` מציג את הארכיון — קישור בשורת הסיכום, לא טאב נפרד,
// כדי שהניווט התחתון יישאר 4 טאבים כמו שהוחלט.
// שורה קומפקטית במקום כרטיס גדול (אופציה א' שאושרה): בערך פי 2 רעיונות
// במסך, והתגובה המהירה נשארת ברשימה.
export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseIdeaListParams(await searchParams);
  const [{ ideas, counts }, partnerName, spaceId] = await Promise.all([listIdeas(filters), getPartnerName(), getMySpaceId()]);
  // תגית מצב (26.9): "מחכה ל[שם]" רק כשיש בן/בת זוג במרחב.
  const partner = { present: spaceId ? await hasPartner(spaceId) : false, name: partnerName };
  const archived = filters.status === "archived";
  const narrowed = hasNarrowingFilter(filters);
  const nothingAtAll = counts.all === 0 && !narrowed && ideas.length === 0;

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          {archived ? "ארכיון רעיונות" : "רעיונות"}
        </h1>
        {!archived && (
          <Link href="/ideas/new" className="btn btn-primary" style={{ padding: "0 18px", minHeight: 40 }}>
            + רעיון
          </Link>
        )}
      </div>

      {nothingAtAll ? (
        archived ? (
          <>
            <EmptyState title="עוד אין רעיונות בארכיון." />
            <p style={{ textAlign: "center", margin: 0 }}>
              <Link href="/ideas" className="link-plain">
                חזרה לרעיונות הפעילים &larr;
              </Link>
            </p>
          </>
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
        <>
          <IdeaSearch filters={filters} />

          <div className="chip-scroll" role="group" aria-label="סינון רעיונות" style={{ marginBottom: 6 }}>
            {!archived && <ViewChips filters={filters} counts={counts} partner={partner} />}
            <CategorySelect filters={filters} />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <p className="status-msg" style={{ margin: 0, fontSize: 12.5 }}>
              {ideas.length === 1 ? "רעיון אחד" : `${ideas.length} רעיונות`}
              {" · "}
              <Link
                href={archived ? "/ideas" : buildIdeasHref(filters, { status: "archived", view: "all" })}
                style={{ color: "inherit" }}
              >
                {archived ? "לפעילים" : "לארכיון"}
              </Link>
            </p>
            <SortSelect filters={filters} />
          </div>

          {ideas.length === 0 ? (
            <EmptyState
              title="אין רעיונות שמתאימים לסינון הזה."
              action={
                <Link href={buildIdeasHref(filters, { q: "", view: "all", category: null })} className="btn btn-primary">
                  איפוס סינון
                </Link>
              }
            />
          ) : (
            ideas.map((idea) => <IdeaRow key={idea.id} idea={idea} archived={archived} partner={partner} />)
          )}
        </>
      )}
    </div>
  );
}

type PartnerInfo = { present: boolean; name: string | null };

function ViewChips({ filters, counts, partner }: { filters: IdeaListFilters; counts: IdeaListCounts; partner: PartnerInfo }) {
  // "מחכה לי" / "מחכה ל[שם]" (26.9) — שני הצדדים באותו ניסוח.
  const views = [
    { view: "all" as const, label: "הכל" },
    { view: "unreacted" as const, label: "מחכה לי" },
    ...(partner.present ? [{ view: "waiting" as const, label: `מחכה ל${partner.name ?? "בן/בת הזוג"}` }] : []),
    { view: "matches" as const, label: "מאצ'ים" },
  ];
  return (
    <>
      {views.map(({ view, label }) => (
        <Link
          key={view}
          href={buildIdeasHref(filters, { view })}
          className="chip"
          aria-current={filters.view === view ? "page" : undefined}
          scroll={false}
          replace
        >
          {label}
          {view !== "all" && ` · ${counts[view]}`}
        </Link>
      ))}
    </>
  );
}

function IdeaRow({ idea, archived, partner }: { idea: IdeaListItemDto; archived: boolean; partner: PartnerInfo }) {
  const tag = archived ? null : ideaStatusTag(idea, partner);
  const href = `/ideas/${idea.id}`;
  const meta = [
    categoryLabels[idea.category],
    formatCostMinor(idea.costMinor),
    formatDurationMinutes(idea.durationMinutes),
    idea.locationText,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={archived ? "card idea-row is-static" : "card idea-row"}>
      <Link href={href} className="idea-row-thumb-link" tabIndex={-1} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי */}
        <img src={getIdeaCoverImage(idea.category)} alt="" className="idea-row-thumb" />
      </Link>
      <Link href={href} className="idea-row-text">
        <div className="idea-row-title-line">
          <p className="idea-row-title">{idea.title}</p>
          {tag && <span className={`status-tag ${tag.kind}`}>{tag.label}</span>}
          {idea.commentCount > 0 && (
            <span
              className={idea.unreadCount > 0 ? "comment-count has-unread" : "comment-count"}
              aria-label={
                idea.unreadCount > 0
                  ? idea.unreadCount === 1
                    ? "הודעה חדשה בשיחה"
                    : `${idea.unreadCount} הודעות חדשות בשיחה`
                  : idea.commentCount === 1
                    ? "הודעה אחת בשיחה"
                    : `${idea.commentCount} הודעות בשיחה`
              }
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
              </svg>
              {idea.commentCount}
            </span>
          )}
        </div>
        <p className="idea-row-meta">{meta}</p>
      </Link>
      {!archived && <ReactionControl ideaId={idea.id} initialReaction={idea.myReaction} size="sm" />}
    </div>
  );
}
