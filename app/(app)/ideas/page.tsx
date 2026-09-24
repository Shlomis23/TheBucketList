import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { ReactionControl } from "@/components/ReactionControl";
import { CategorySelect, IdeaSearch, SortSelect } from "@/components/IdeaFilterControls";
import { listIdeas, type IdeaDto, type IdeaListCounts } from "@/lib/dal/ideas";
import { categoryLabels, formatCostMinor, formatDurationMinutes } from "@/lib/validation/idea";
import {
  buildIdeasHref,
  hasNarrowingFilter,
  parseIdeaListParams,
  type IdeaListFilters,
  type IdeaListView,
} from "@/lib/validation/ideaList";
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
  const { ideas, counts } = await listIdeas(filters);
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
            {!archived && <ViewChips filters={filters} counts={counts} />}
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
            ideas.map((idea) => <IdeaRow key={idea.id} idea={idea} archived={archived} />)
          )}
        </>
      )}
    </div>
  );
}

const VIEW_LABELS: Record<IdeaListView, string> = {
  all: "הכל",
  unreacted: "עוד לא הגבתי",
  matches: "מאצ'ים",
};

function ViewChips({ filters, counts }: { filters: IdeaListFilters; counts: IdeaListCounts }) {
  return (
    <>
      {(["all", "unreacted", "matches"] as const).map((view) => (
        <Link
          key={view}
          href={buildIdeasHref(filters, { view })}
          className="chip"
          aria-current={filters.view === view ? "page" : undefined}
          scroll={false}
          replace
        >
          {VIEW_LABELS[view]}
          {view !== "all" && ` · ${counts[view]}`}
        </Link>
      ))}
    </>
  );
}

function IdeaRow({ idea, archived }: { idea: IdeaDto; archived: boolean }) {
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
          {idea.isMatch && <span className="badge badge-green badge-sm">מאצ&apos;!</span>}
        </div>
        <p className="idea-row-meta">{meta}</p>
      </Link>
      {!archived && <ReactionControl ideaId={idea.id} initialReaction={idea.myReaction} size="sm" />}
    </div>
  );
}
