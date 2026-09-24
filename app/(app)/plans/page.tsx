import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { listPlans, type PlanDto } from "@/lib/dal/plans";
import { formatPlanWhen } from "@/lib/validation/plan";
import { getIdeaCoverImage } from "@/lib/covers";

// תוכניות `/plans` — spec סעיף 6: מוצעות/מאושרות/עבר; סדר כרונולוגי;
// מועד לא נקבע בסוף. "מאושר" הוא ערך נגזר (isConfirmedByBoth), לא status —
// לכן הקיבוץ נעשה כאן ולא ב-query. listPlans כבר ממיין starts_at עם
// nullsFirst:false, כך שבתוך כל קבוצה מועד לא נקבע נופל לסוף ממילא.
export default async function PlansPage() {
  const plans = await listPlans();

  if (plans.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">תוכניות</h1>
        <EmptyState
          title="עוד אין תוכנית — בחרו רעיון כדי להתחיל."
          action={
            <Link href="/choose" className="btn btn-primary">
              מה עושים?
            </Link>
          }
        />
      </div>
    );
  }

  const proposed = plans.filter((p) => p.status === "proposed" && !p.isConfirmedByBoth);
  const confirmed = plans.filter((p) => p.status === "proposed" && p.isConfirmedByBoth);
  const past = plans.filter((p) => p.status === "completed" || p.status === "cancelled");

  return (
    <div className="page">
      <h1 className="page-title">תוכניות</h1>

      {confirmed.length > 0 && (
        <PlanSection title="מאושרות לשנינו" plans={confirmed} />
      )}
      {proposed.length > 0 && (
        <PlanSection title="מוצעות" plans={proposed} />
      )}
      {past.length > 0 && <PlanSection title="עבר" plans={past} muted />}
    </div>
  );
}

function PlanSection({ title, plans, muted }: { title: string; plans: PlanDto[]; muted?: boolean }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p className="page-eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} muted={muted} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, muted }: { plan: PlanDto; muted?: boolean }) {
  const statusBadge =
    plan.status === "cancelled" ? (
      <span className="badge badge-neutral">בוטלה</span>
    ) : plan.status === "completed" ? (
      <span className="badge badge-green">בוצע</span>
    ) : plan.isConfirmedByBoth ? (
      <span className="badge badge-green">מאושר לשנינו</span>
    ) : (
      <span className="badge badge-yellow">ממתין לאישור</span>
    );

  return (
    <Link
      href={`/plans/${plan.id}`}
      className="card"
      style={{ display: "block", textDecoration: "none", opacity: muted ? 0.8 : 1 }}
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
        {formatPlanWhen(plan.startsAt)}
        {plan.meetingPlace ? ` · ${plan.meetingPlace}` : ""}
      </p>
    </Link>
  );
}
