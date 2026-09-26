import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
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
import { CoverImg } from "@/components/CoverImg";
import { pendingPreview } from "@/lib/validation/review";

const PREF_LABEL = { yes: "כן", maybe: "אולי", no: "לא" } as const;

// מאגר `/ideas` — spec סעיף 6: חיפוש, פילטר קטגוריה/מאצ'ים/תגובה שלי, מיון.
// כל הסינון ב-URL (ראו lib/validation/ideaList.ts) ומבוצע בשרת ב-listIdeas.
// `?status=archived` מציג את הארכיון — קישור בשורת הסיכום, לא טאב נפרד,
// כדי שהניווט התחתון יישאר 4 טאבים כמו שהוחלט.
// שורה אחת לכל רעיון (26.9, אפשרות א): התגובה עברה לסבב ההחלטות (הבאנר
// למעלה) ולדף הרעיון; ברשימה רק "שלך: כן" ותגית המצב.
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
      <div className="flex items-center justify-between mb-12">
        <h1 className="page-title mb-0">
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
            <p className="text-center m-0">
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

          {!archived && !narrowed && counts.unreacted > 0 && (
            <ReviewBanner count={counts.unreacted} titles={ideas.filter((i) => i.myReaction === null).map((i) => i.title)} />
          )}

          <div className="chip-scroll mb-8" role="group" aria-label="סינון רעיונות">
            {!archived && <ViewChips filters={filters} counts={counts} partner={partner} />}
            <CategorySelect filters={filters} />
          </div>

          <div className="flex items-center justify-between gap-8 mb-8"
          >
            <p className="status-msg m-0 text-xs">
              {ideas.length === 1 ? "רעיון אחד" : `${ideas.length} רעיונות`}
              {" · "}
              <Link className="c-inherit"
                href={archived ? "/ideas" : buildIdeasHref(filters, { status: "archived", view: "all" })}
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

// "מחכים לתגובה שלך" (26.9, אפשרות א) — כניסה לסבב ההחלטות. רק בלי חיפוש/
// קטגוריה, כדי שהמספר יתאים למה שיופיע בסבב (כל מה שעוד לא הגבתי עליו).
function ReviewBanner({ count, titles }: { count: number; titles: string[] }) {
  return (
    <Link href="/ideas/review" className="review-banner">
      <span className="review-banner-count">{count}</span>
      <span className="review-banner-text">
        <b>{count === 1 ? "רעיון מחכה לתגובה שלך" : "מחכים לתגובה שלך"}</b>
        {titles.length > 0 && <span>{pendingPreview(titles)}</span>}
      </span>
      <span className="review-banner-go">לסבב</span>
    </Link>
  );
}

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
    <div className="card idea-row" data-idea-id={idea.id}>
      <Link href={href} className="idea-row-thumb-link" tabIndex={-1} aria-hidden="true">
        <CoverImg category={idea.category} className="idea-row-thumb" />
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
        <p className="idea-row-meta">
          {!archived && idea.myReaction && <span className="idea-row-mine">שלך: {PREF_LABEL[idea.myReaction]} · </span>}
          {meta}
        </p>
      </Link>
    </div>
  );
}
