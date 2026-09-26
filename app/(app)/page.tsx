import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId } from "@/lib/dal/space";
import { getHome } from "@/lib/dal/home";
import { pastWhenLabel, upcomingWhenLabel } from "@/lib/validation/plan";
import { pickHeroKind } from "@/lib/validation/home";
import { HeroCard, HomeRow, LatestMemoryRow, type Row } from "@/components/HomeHero";
import { getLatestMemory, getOnThisDay } from "@/lib/dal/memories";
import { OnThisDayCard } from "@/components/OnThisDayCard";
import { getUnreadConversations } from "@/lib/dal/conversations";
import { PageTransition } from "@/components/PageTransition";

// בית `/` — כרטיס עליון אחד (26.9, אפשרות א): הדבר הכי חשוב עכשיו בכרטיס
// גדול (lib/validation/home.ts — סדר העדיפויות), וכל השאר בשורות קצרות
// ב"עוד בשבילך". "לפני שנה בדיוק" נשאר כרטיס נפרד מעל, רק בימים שיש.
// מאצ' בלי תוכנית לא מופיע בבית בכוונה (בנק רעיונות, לא רשימת משימות).
export default async function HomePage() {
  // userId ו-spaceId לא תלויים זה בזה — במקביל, בלי קפיצת רשת מיותרת.
  const [userId, spaceId] = await Promise.all([getVerifiedUserId(), getMySpaceId()]);
  if (!userId) redirect("/login");
  if (!spaceId) redirect("/onboarding");

  const [home, latestMemory, unread, onThisDay] = await Promise.all([
    getHome(spaceId, userId),
    getLatestMemory(),
    getUnreadConversations(),
    getOnThisDay(),
  ]);
  const greetingName = home.displayName || "שם";
  const hero = pickHeroKind({
    upcomingPlan: home.upcomingPlan,
    pastPlansCount: home.pastPlans.length,
    partnerNewIdeasCount: home.partnerNewIdeasTotal,
    unreadCount: unread.length,
  });
  const from = home.partnerName ? `מ${home.partnerName}` : "מבן/בת הזוג";

  // "עוד בשבילך" — כל מה שלא עלה לכרטיס, באותו סדר עדיפויות.
  const rows: Row[] = [];
  for (const plan of home.pastPlans.slice(hero === "how_was" ? 1 : 0)) {
    rows.push({
      key: `past-${plan.id}`,
      href: `/plans/${plan.id}?complete=1`,
      icon: "how",
      title: `איך היה: ${plan.title}?`,
      sub: plan.startsAt ? `היה ${pastWhenLabel(plan.startsAt)} · שומרים כזיכרון?` : "שומרים כזיכרון?",
    });
  }
  // רעיונות חדשים מבן/בת הזוג — שורה רק כשהכרטיס למעלה תפוס בדבר אחר
  // (26.9: כשהוא "חדש מ...", הוא כבר מכסה את כולם — רעיון אחד או כניסה לסבב).
  const ideasLeft = hero === "partner_idea" ? 0 : home.partnerNewIdeasTotal;
  if (ideasLeft > 0) {
    const first = home.partnerNewIdeas[0];
    rows.push({
      key: "partner-ideas",
      // כמה רעיונות — לסבב ההחלטות; רעיון אחד — ישר אליו.
      href: ideasLeft > 1 ? `/ideas/review${first ? `?first=${first.id}` : ""}` : first ? `/ideas/${first.id}` : "/ideas/review",
      icon: "idea",
      title: ideasLeft === 1 ? `רעיון חדש ${from}` : `${ideasLeft} רעיונות חדשים ${from}`,
      sub: ideasLeft > 1 ? "סבב קצר — עוד לא ענית עליהם" : first ? `${first.title} · עוד לא ענית` : "עוד לא ענית",
    });
  }
  for (const c of unread.slice(hero === "unread" ? 1 : 0, 3)) {
    rows.push({
      key: `unread-${c.ideaId}`,
      href: `/ideas/${c.ideaId}`,
      icon: "msg",
      title: c.unreadCount === 1 ? "הודעה חדשה" : `${c.unreadCount} הודעות חדשות`,
      sub: `${c.lastAuthor ? `${c.lastAuthor} על ` : "על "}"${c.ideaTitle}"`,
    });
  }
  if (home.upcomingPlan && hero !== "plan_today" && hero !== "upcoming") {
    rows.push({
      key: "upcoming",
      href: `/plans/${home.upcomingPlan.id}`,
      icon: "plan",
      title: `התוכנית הקרובה: ${home.upcomingPlan.title}`,
      sub: upcomingWhenLabel(home.upcomingPlan.startsAt),
    });
  }

  return (
    <PageTransition kind="list">
      <div className="page" style={{ paddingTop: "calc(28px + var(--safe-area-top))" }}>
        {/* כניסה להגדרות (שם, הזמנה, התנתקות). הניווט התחתון נשאר 4 טאבים
            כמו שהוחלט, ובלי הכפתור הזה ההגדרות היו נגישות רק במצב "מחכים
            לבן/בת הזוג". */}
        <div className="flex items-center justify-between gap-8">
          <p className="page-eyebrow m-0">
            The Bucket List
          </p>
          <Link href="/settings" aria-label="הגדרות" className="icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
          </Link>
        </div>
        <h1 className="page-title mt-2">היי, {greetingName}</h1>
        {!home.waitingForPartner && (home.matchesCount > 0 || home.ideasCount > 0) && (
          <div className="home-stats">
            <Link href="/ideas?view=matches">{home.matchesCount === 1 ? "מאצ' אחד" : `${home.matchesCount} מאצ'ים`}</Link>
            <Link href="/ideas">{home.ideasCount === 1 ? "רעיון אחד" : `${home.ideasCount} רעיונות`}</Link>
          </div>
        )}
        {home.waitingForPartner && (
          <p className="page-subtitle">עוד לא הצטרפו אליכם — בינתיים אפשר להתחיל לצבור רעיונות.</p>
        )}
  
        {onThisDay && <OnThisDayCard memory={onThisDay.memory} label={onThisDay.label} />}
  
        <HeroCard kind={hero} home={home} unread={unread} from={from} />
  
        {rows.length > 0 && (
          <section className="mb-12" aria-labelledby="more-for-you">
            <p id="more-for-you" className="home-more-h">
              עוד בשבילך
            </p>
            {rows.map((r) => (
              <HomeRow key={r.key} row={r} />
            ))}
          </section>
        )}
  
        {hero !== "idle" && (
          <Link href="/choose" className="btn btn-block home-choose">
            מה עושים היום?
          </Link>
        )}
  
        {latestMemory && latestMemory.id !== onThisDay?.memory.id && <LatestMemoryRow memory={latestMemory} />}
  
        {home.ideasCount === 0 && (
          <Link
            href="/ideas/new"
            className="card block no-underline mb-12"
          >
            <p className="m-0 fw-700">מה הדבר הראשון שבא לכם לעשות?</p>
            <p className="status-msg m-0 mt-4">הוספת רעיון ראשון &larr;</p>
          </Link>
        )}
  
        {home.waitingForPartner && (
          <Link
            href="/settings#invite"
            className="card block no-underline bg-soft"
          >
            <p className="m-0 fw-700 c-primary">
              מחכים לבן/בת הזוג שלך
            </p>
            <p className="status-msg m-0 mt-4">
              הזמנת בן/בת הזוג &larr;
            </p>
          </Link>
        )}
      </div>
    </PageTransition>
  );
}
