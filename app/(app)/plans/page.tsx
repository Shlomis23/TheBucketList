import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { listPlans, type PlanDto } from "@/lib/dal/plans";
import { formatPlanWhen, isPlanPast, pastWhenLabel } from "@/lib/validation/plan";
import { getIdeaCoverImage } from "@/lib/covers";

// תוכניות `/plans` — רק פעילות. מה שבוצע נמצא בזיכרונות, מה שבוטל לא מוצג
// (25.9). בלי "מוצעות/מאושרות" — אין שלב אישור (25.9). למעלה "המועד עבר",
// אחר כך "לפנינו" לפי תאריך; listPlans ממיין starts_at עם nullsFirst:false,
// כך שתוכנית בלי מועד נופלת לסוף.
export default async function PlansPage() {
  const plans = await listPlans();

  if (plans.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">תוכניות</h1>
        <EmptyState
          title="אין תוכנית פתוחה כרגע — בחרו רעיון כדי להתחיל. מה שכבר עשיתם מחכה בזיכרונות."
          action={
            <Link href="/choose" className="btn btn-primary">
              מה עושים?
            </Link>
          }
        />
      </div>
    );
  }

  // מה שהמועד שלו עבר — בראש, "מחכות לסיכום" (25.9), ולא מתערבב עם מה שלפנינו.
  const past = plans.filter((p) => isPlanPast(p.startsAt, p.endsAt));
  const ahead = plans.filter((p) => !past.includes(p));

  return (
    <div className="page">
      <h1 className="page-title">תוכניות</h1>

      {past.length > 0 && <PlanSection title="המועד עבר — איך היה?" plans={past} />}
      {ahead.length > 0 && <PlanSection title={past.length > 0 ? "לפנינו" : ""} plans={ahead} />}
    </div>
  );
}

function PlanSection({ title, plans }: { title: string; plans: PlanDto[] }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {title && (
        <p className="page-eyebrow" style={{ marginBottom: 8 }}>
          {title}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: PlanDto }) {
  const past = isPlanPast(plan.startsAt, plan.endsAt);
  const statusBadge = past ? (
    <span className="badge badge-pink">מחכה לסיכום</span>
  ) : !plan.startsAt ? (
    <span className="badge badge-yellow">מועד לא נקבע</span>
  ) : null;

  return (
    <Link
      href={`/plans/${plan.id}`}
      className="card"
      style={{ display: "block", textDecoration: "none" }}
    >
      {plan.ideaCategory && (
        // eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי
        <img src={getIdeaCoverImage(plan.ideaCategory)} alt="" className="card-cover-img cover-sm" />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 16 }}>{plan.title}</p>
        {statusBadge}
      </div>
      <p className="status-msg" style={{ margin: 0 }}>
        {past ? `היה ${pastWhenLabel(plan.startsAt)}` : formatPlanWhen(plan.startsAt)}
        {plan.meetingPlace ? ` · ${plan.meetingPlace}` : ""}
      </p>
    </Link>
  );
}
