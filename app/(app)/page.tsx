import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId } from "@/lib/dal/space";
import { getHome, type PartnerNewIdea, type PastPlan } from "@/lib/dal/home";
import { pastWhenLabel, upcomingWhenLabel } from "@/lib/validation/plan";
import { getIdeaCoverImage } from "@/lib/covers";
import { categoryLabels, type IdeaCategory } from "@/lib/validation/idea";
import { ReactionControl } from "@/components/ReactionControl";
import { MemoryCard } from "@/components/MemoryCard";
import { getLatestMemory, getOnThisDay } from "@/lib/dal/memories";
import { OnThisDayCard } from "@/components/OnThisDayCard";
import { getUnreadConversations, type UnreadConversation } from "@/lib/dal/conversations";

// בית `/` — spec סעיף 6, 13.3 (getHome).
// שלד "רעיונות אחרונים" בתור תצוגה מקדימה בפועל (לא רק מספר) ממתין ל-listIdeas
// אמיתי (F3). "מה עושים?" ו-"+" כאן פשוט מקשרים ל-/choose ו-/ideas/new
// שכרגע placeholder — לא מעמידים פנים שהפיצ'רים האלה כבר עובדים.
export default async function HomePage() {
  // userId ו-spaceId לא תלויים זה בזה (spaceId נשען על עוגיית ה-session,
  // לא על הערך של userId) — מריצים במקביל כדי לחסוך קפיצת רשת שלמה
  // בכל טעינת מסך (תוכנית שיפור מהירות, פריט 3).
  const [userId, spaceId] = await Promise.all([getVerifiedUserId(), getMySpaceId()]);
  if (!userId) redirect("/login");
  if (!spaceId) redirect("/onboarding");

  // "הזיכרון האחרון" במקביל ל-getHome — בלי קפיצת רשת נוספת.
  const [home, latestMemory, unread, onThisDay] = await Promise.all([
    getHome(spaceId, userId),
    getLatestMemory(),
    getUnreadConversations(),
    getOnThisDay(),
  ]);
  const greetingName = home.displayName || "שם";

  return (
    <div className="page" style={{ paddingTop: "calc(28px + var(--safe-area-top))" }}>
      {/* כניסה להגדרות (שם, הזמנה, התנתקות). הניווט התחתון נשאר 4 טאבים
          כמו שהוחלט, ובלי הכפתור הזה ההגדרות היו נגישות רק במצב "מחכים
          לבן/בת הזוג". */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p className="page-eyebrow" style={{ margin: 0 }}>
          The Bucket List
        </p>
        <Link href="/settings" aria-label="הגדרות" className="icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </Link>
      </div>
      <h1 className="page-title" style={{ marginTop: 2 }}>היי, {greetingName}</h1>
      <p className="page-subtitle">
        {home.waitingForPartner
          ? "עוד לא הצטרפו אליכם — בינתיים אפשר להתחיל לצבור רעיונות."
          : "איזו הרפתקה מחכה לכם היום?"}
      </p>

      {onThisDay && <OnThisDayCard memory={onThisDay.memory} label={onThisDay.label} />}

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ flex: 1, textAlign: "center", padding: "16px 10px" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-primary)" }}>
            {home.matchesCount}
          </div>
          <div className="status-msg" style={{ fontSize: 12.5 }}>
            מאצ&apos;ים
          </div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: "center", padding: "16px 10px" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-primary)" }}>
            {home.ideasCount}
          </div>
          <div className="status-msg" style={{ fontSize: 12.5 }}>
            רעיונות פתוחים
          </div>
        </div>
      </div>

      <PastPlansSection plans={home.pastPlans} />

      <UnreadSection items={unread} />

      <PartnerNewIdeasSection
        ideas={home.partnerNewIdeas}
        total={home.partnerNewIdeasTotal}
        partnerName={home.partnerName}
      />

      <UpcomingPlanCard plan={home.upcomingPlan} />

      <Link href="/choose" className="btn btn-primary btn-block" style={{ marginBottom: 12 }}>
        מה עושים היום?
      </Link>

      {latestMemory && latestMemory.id !== onThisDay?.memory.id && (
        <div style={{ marginTop: 8 }}>
          <MemoryCard memory={latestMemory} eyebrow="הזיכרון האחרון" />
        </div>
      )}

      {home.ideasCount === 0 && (
        <Link
          href="/ideas/new"
          className="card"
          style={{ display: "block", textDecoration: "none", marginBottom: 12 }}
        >
          <p style={{ margin: 0, fontWeight: 700 }}>מה הדבר הראשון שבא לכם לעשות?</p>
          <p className="status-msg" style={{ margin: "4px 0 0" }}>הוספת רעיון ראשון &larr;</p>
        </Link>
      )}

      {home.waitingForPartner && (
        <Link
          href="/settings#invite"
          className="card"
          style={{ display: "block", textDecoration: "none", background: "var(--color-primary-soft)" }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: "var(--color-primary)" }}>
            מחכים לבן/בת הזוג שלך
          </p>
          <p className="status-msg" style={{ margin: "4px 0 0" }}>
            הזמנת בן/בת הזוג &larr;
          </p>
        </Link>
      )}
    </div>
  );
}

// "איך היה?" (25.9) — תוכניות שהמועד שלהן עבר ועוד לא נסגרו. שתי דרכים
// החוצה: לשמור כזיכרון (פותח ישר את טופס ההשלמה), או לדף התוכנית לדחות/לבטל.
function PastPlansSection({ plans }: { plans: PastPlan[] }) {
  if (plans.length === 0) return null;
  return (
    <section aria-labelledby="past-plans" style={{ marginBottom: 16 }}>
      <p id="past-plans" className="page-eyebrow" style={{ marginBottom: 8 }}>
        איך היה?
      </p>
      {plans.map((plan) => (
        <div key={plan.id} className="card" style={{ marginBottom: 10 }}>
          {plan.ideaCategory && (
            // eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי
            <img src={getIdeaCoverImage(plan.ideaCategory)} alt="" className="card-cover-img cover-sm" />
          )}
          <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 16 }}>{plan.title}</p>
          <p className="status-msg" style={{ margin: "0 0 12px", fontSize: 13 }}>
            {plan.startsAt ? `היה ${pastWhenLabel(plan.startsAt)}. ` : ""}עשיתם את זה?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href={`/plans/${plan.id}?complete=1`} className="btn btn-primary" style={{ flex: 1 }}>
              כן! לשמור כזיכרון
            </Link>
            <Link
              href={`/plans/${plan.id}`}
              className="btn"
              style={{ flex: 1, background: "transparent", border: "1.5px solid var(--color-border)" }}
            >
              לא יצא
            </Link>
          </div>
        </div>
      ))}
    </section>
  );
}

// "הודעות חדשות" (0026) — שיחות על רעיונות שיש בהן הודעה מבן/בת הזוג שעוד
// לא ראיתי. לחיצה פותחת את הרעיון (ומסמנת כנקרא). עד 3; השאר ברשימת הרעיונות.
function UnreadSection({ items }: { items: UnreadConversation[] }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, 3);
  return (
    <section aria-labelledby="unread" className="card" style={{ marginBottom: 16 }}>
      <p id="unread" className="page-eyebrow" style={{ marginBottom: 10 }}>
        הודעות חדשות
      </p>
      {shown.map((c) => (
        <Link key={c.ideaId} href={`/ideas/${c.ideaId}`} className="unread-row">
          <span className="unread-dot" aria-hidden="true" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.ideaTitle}
            </span>
            <span className="status-msg" style={{ fontSize: 12.5 }}>
              {c.unreadCount === 1 ? "הודעה חדשה" : `${c.unreadCount} הודעות חדשות`}
              {c.lastAuthor ? ` מ${c.lastAuthor}` : ""}
            </span>
          </span>
          <span aria-hidden="true" style={{ color: "var(--color-primary)" }}>
            &larr;
          </span>
        </Link>
      ))}
      {items.length > shown.length && (
        <p className="status-msg" style={{ margin: "8px 0 0", fontSize: 12.5 }}>
          ועוד {items.length - shown.length} ברשימת הרעיונות
        </p>
      )}
    </section>
  );
}

// "חדש מבן/בת הזוג" — רעיונות שבן/בת הזוג הוסיפו ואני עוד לא הגבתי עליהם.
// אפשר להגיב ישר מכאן; setReactionAction עושה revalidatePath("/"), כך
// שאחרי תגובה הכרטיס יוצא מהרשימה. כשאין כאלה — הסקשן לא מוצג בכלל.
function PartnerNewIdeasSection({
  ideas,
  total,
  partnerName,
}: {
  ideas: PartnerNewIdea[];
  total: number;
  partnerName: string | null;
}) {
  if (ideas.length === 0) return null;
  const more = total - ideas.length;

  return (
    <section aria-labelledby="partner-new-ideas" style={{ marginBottom: 16 }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}
      >
        <p id="partner-new-ideas" className="page-eyebrow" style={{ margin: 0 }}>
          {partnerName ? `חדש מ${partnerName}` : "חדש מבן/בת הזוג"}
        </p>
        <span className="badge badge-pink">{total === 1 ? "רעיון אחד מחכה לך" : `${total} מחכים לך`}</span>
      </div>

      {ideas.map((idea) => (
        <div key={idea.id} className="card idea-card">
          <Link href={`/ideas/${idea.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי */}
            <img src={getIdeaCoverImage(idea.category)} alt="" className="card-cover-img cover-sm" />
            <span className="badge badge-neutral" style={{ marginBottom: 6 }}>
              {categoryLabels[idea.category]}
            </span>
            <p style={{ margin: "6px 0 10px", fontWeight: 800, fontSize: 16 }}>{idea.title}</p>
          </Link>
          <ReactionControl ideaId={idea.id} initialReaction={null} />
        </div>
      ))}

      {more > 0 && (
        <Link href="/ideas?view=unreacted" className="link-plain" style={{ display: "inline-block", marginTop: 2 }}>
          ועוד {more} ברשימת הרעיונות &larr;
        </Link>
      )}
    </section>
  );
}

function UpcomingPlanCard({
  plan,
}: {
  plan: {
    id: string;
    title: string;
    startsAt: string | null;
    meetingPlace: string | null;
    ideaCategory: IdeaCategory | null;
  } | null;
}) {
  if (!plan) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="status-msg">עוד אין תוכנית קרובה. אפשר לבחור רעיון ולהתחיל לתכנן.</p>
      </div>
    );
  }

  const when = upcomingWhenLabel(plan.startsAt);

  return (
    <Link
      href={`/plans/${plan.id}`}
      className="card"
      style={{ display: "block", textDecoration: "none", marginBottom: 16 }}
    >
      {plan.ideaCategory && (
        // eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי
        <img src={getIdeaCoverImage(plan.ideaCategory)} alt="" className="card-cover-img cover-sm" />
      )}
      <p className="page-eyebrow" style={{ marginBottom: 4 }}>
        התוכנית הקרובה
      </p>
      <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 17 }}>{plan.title}</p>
      <p className="status-msg" style={{ margin: 0 }}>
        {when}
        {plan.meetingPlace ? ` · ${plan.meetingPlace}` : ""}
      </p>
    </Link>
  );
}
