import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId } from "@/lib/dal/space";
import { getHome } from "@/lib/dal/home";
import { getIdeaCoverImage } from "@/lib/covers";
import type { IdeaCategory } from "@/lib/validation/idea";

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

  const home = await getHome(spaceId, userId);
  const greetingName = home.displayName || "שם";

  return (
    <div className="page" style={{ paddingTop: "calc(28px + var(--safe-area-top))" }}>
      <p className="page-eyebrow">The Bucket List</p>
      <h1 className="page-title">היי, {greetingName}</h1>
      <p className="page-subtitle">
        {home.waitingForPartner
          ? "עוד לא הצטרפו אליכם — בינתיים אפשר להתחיל לצבור רעיונות."
          : "איזו הרפתקה מחכה לכם היום?"}
      </p>

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

      <UpcomingPlanCard plan={home.upcomingPlan} />

      <Link href="/choose" className="btn btn-primary btn-block" style={{ marginBottom: 12 }}>
        מה עושים היום?
      </Link>

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

  const when = plan.startsAt
    ? new Intl.DateTimeFormat("he-IL", {
        timeZone: "Asia/Jerusalem",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(plan.startsAt))
    : "מועד לא נקבע עדיין";

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
