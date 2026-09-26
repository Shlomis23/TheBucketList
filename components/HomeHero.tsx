import Link from "next/link";
import type { HomeSummary } from "@/lib/dal/home";
import type { MemoryDto } from "@/lib/dal/memories";
import type { UnreadConversation } from "@/lib/dal/conversations";
import { pastWhenLabel, upcomingWhenLabel } from "@/lib/validation/plan";
import { daysUntilLabel, planTodayKicker, type HeroKind } from "@/lib/validation/home";
import { categoryLabels } from "@/lib/validation/idea";
import { formatMemoryDate } from "@/lib/validation/memory";
import { ReactionControl } from "@/components/ReactionControl";
import { NavigateTile } from "@/components/NavigateTile";

// רכיבי מסך הבית (26.9, אפשרות א): הכרטיס הגדול, שורות "עוד בשבילך",
// ושורת "הזיכרון האחרון". ההחלטה מה עולה לכרטיס — lib/validation/home.ts.

// ---------------------------------------------------------------------------
// הכרטיס הגדול
// ---------------------------------------------------------------------------
export function HeroCard({
  kind,
  home,
  unread,
  from,
}: {
  kind: HeroKind;
  home: HomeSummary;
  unread: UnreadConversation[];
  from: string;
}) {
  const plan = home.upcomingPlan;

  if (kind === "plan_today" && plan?.startsAt) {
    return (
      <section className="hero-card tonight" aria-label="התוכנית של היום">
        <span className="hero-kicker">{planTodayKicker(plan.startsAt)}</span>
        <h2 className="hero-title">{plan.title}</h2>
        <p className="hero-sub">
          {upcomingWhenLabel(plan.startsAt)}
          {plan.meetingPlace ? ` · ${plan.meetingPlace}` : ""}
        </p>
        {plan.navPlace && <NavigateTile place={plan.navPlace} placeId={plan.navPlaceId} className="mb-8" />}
        <Link href={`/plans/${plan.id}`} className="btn btn-block hero-btn-glass">
          לתוכנית
        </Link>
      </section>
    );
  }

  if (kind === "how_was") {
    const past = home.pastPlans[0];
    return (
      <section className="hero-card howwas" aria-label="איך היה?">
        <span className="hero-kicker">{past.startsAt ? pastWhenLabel(past.startsAt) : "איך היה?"}</span>
        <h2 className="hero-title">איך היה: {past.title}?</h2>
        <p className="hero-sub">שומרים כזיכרון, עם תמונות?</p>
        <div className="hero-actions">
          <Link href={`/plans/${past.id}?complete=1`} className="btn hero-btn-white">
            עשינו את זה!
          </Link>
          <Link href={`/plans/${past.id}`} className="btn hero-btn-glass">
            לא יצא
          </Link>
        </div>
      </section>
    );
  }

  if (kind === "partner_idea") {
    const idea = home.partnerNewIdeas[0];
    return (
      <section className="hero-card light" aria-label={`רעיון חדש ${from}`}>
        <span className="hero-kicker yellow">חדש {from}</span>
        <Link href={`/ideas/${idea.id}`} className="hero-link">
          <h2 className="hero-title">{idea.title}</h2>
          <p className="hero-sub">{categoryLabels[idea.category]} · עוד לא ענית</p>
        </Link>
        <ReactionControl ideaId={idea.id} initialReaction={null} />
      </section>
    );
  }

  if (kind === "unread") {
    const c = unread[0];
    return (
      <section className="hero-card light" aria-label="הודעה חדשה">
        <span className="hero-kicker soft">{c.unreadCount === 1 ? "הודעה חדשה" : `${c.unreadCount} הודעות חדשות`}</span>
        <h2 className="hero-title">{c.ideaTitle}</h2>
        <p className="hero-sub">{c.lastAuthor ? `מ${c.lastAuthor}, בשיחה על הרעיון` : "בשיחה על הרעיון"}</p>
        <Link href={`/ideas/${c.ideaId}`} className="btn btn-primary btn-block">
          לשיחה
        </Link>
      </section>
    );
  }

  if (kind === "upcoming" && plan) {
    return (
      <section className="hero-card soon" aria-label="התוכנית הקרובה">
        <span className="hero-kicker">{daysUntilLabel(plan.startsAt)}</span>
        <h2 className="hero-title">{plan.title}</h2>
        <p className="hero-sub">
          {upcomingWhenLabel(plan.startsAt)}
          {plan.meetingPlace ? ` · ${plan.meetingPlace}` : ""}
        </p>
        <Link href={`/plans/${plan.id}`} className="btn btn-block hero-btn-glass">
          לתוכנית
        </Link>
      </section>
    );
  }

  return (
    <section className="hero-card idle" aria-label="מה עושים היום?">
      <h2 className="hero-title">מה עושים היום?</h2>
      <p className="hero-sub">
        {home.ideasCount > 0
          ? `${home.ideasCount === 1 ? "רעיון אחד מחכה" : `${home.ideasCount} רעיונות מחכים`}. נבחר אחד ביחד?`
          : "עוד אין רעיונות. מה הדבר הראשון שבא לכם לעשות?"}
      </p>
      <Link href={home.ideasCount > 0 ? "/choose" : "/ideas/new"} className="btn btn-block hero-btn-white">
        {home.ideasCount > 0 ? "בואו נבחר" : "הוספת רעיון"}
      </Link>
    </section>
  );
}

// ---------------------------------------------------------------------------
// "עוד בשבילך" — שורה קצרה לכל דבר
// ---------------------------------------------------------------------------
export type Row = { key: string; href: string; icon: "how" | "idea" | "msg" | "plan"; title: string; sub: string };

const ROW_ICONS: Record<Row["icon"], React.ReactNode> = {
  how: <path d="M4 8h3l2-3h6l2 3h3v11H4ZM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />,
  idea: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" />,
  msg: <path d="M4 5h16v11H9l-5 4Z" />,
  plan: <path d="M4 6h16v14H4ZM4 10h16M9 3v4M15 3v4" />,
};

export function HomeRow({ row }: { row: Row }) {
  return (
    <Link href={row.href} className="home-row">
      <span className={`home-row-ic ${row.icon}`} aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {ROW_ICONS[row.icon]}
        </svg>
      </span>
      <span className="home-row-text">
        <span className="home-row-title">{row.title}</span>
        <span className="home-row-sub">{row.sub}</span>
      </span>
      <span className="home-row-chev" aria-hidden="true">
        &lsaquo;
      </span>
    </Link>
  );
}

export function LatestMemoryRow({ memory }: { memory: MemoryDto }) {
  return (
    <Link href={`/memories/${memory.id}`} className="home-row mt-4">
      {memory.coverPhotoId ? (
        // eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית דרך route מאומת, לא next/image
        <img src={`/api/photos/${memory.coverPhotoId}/content?v=thumb`} alt="" className="home-row-thumb" loading="lazy" />
      ) : (
        <span className="home-row-ic memory" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20s-7-4.4-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.6 12 20 12 20Z" />
          </svg>
        </span>
      )}
      <span className="home-row-text">
        <span className="home-row-title">הזיכרון האחרון: {memory.title}</span>
        <span className="home-row-sub">{formatMemoryDate(memory.happenedOn, false)}</span>
      </span>
      <span className="home-row-chev" aria-hidden="true">
        &lsaquo;
      </span>
    </Link>
  );
}
