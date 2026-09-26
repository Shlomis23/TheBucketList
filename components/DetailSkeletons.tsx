"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { CoverImg } from "@/components/CoverImg";
import { MemoryHero } from "@/components/MemoryHero";
import { PageTransition } from "@/components/PageTransition";
import { PlanStatusBadge } from "@/components/PlanStatusBadge";
import { getPreview, getRecentPreview, type PreviewKind } from "@/lib/nav/preview";
import { categoryLabels } from "@/lib/validation/idea";
import { formatPlanWhen } from "@/lib/validation/plan";

// שלדי הטעינה של דפי הפרטים (27.9) — רעיון, תוכנית, זיכרון. כשנכנסו מקישור
// שהשאיר תצוגה מקדימה (lib/nav/preview), החלק העליון זהה לדף האמיתי —
// כך שכשהתוכן מגיע הוא לא זז; רק מה שמתחת מתמלא. אחרת — שלד רגיל.
// הכתובת נלקחת מ-usePathname ולא useParams: השלד יושב מעל הסגמנט [id],
// ושם id עוד לא קיים. התצוגה נקראת פעם אחת בעלייה (טבלה בזיכרון).

function usePreview<K extends PreviewKind>(kind: K) {
  const pathname = usePathname();
  const [preview] = useState(() => getPreview(pathname, kind));
  return preview;
}

function Lines({ widths }: { widths: string[] }) {
  return (
    <>
      {widths.map((w, i) => (
        <div key={i} className={`skeleton skeleton-line${i < widths.length - 1 ? " mb-8" : ""}`} style={{ width: w }} />
      ))}
    </>
  );
}

export function IdeaSkeleton() {
  const p = usePreview("idea");
  return (
    <PageTransition skeleton={p ? "none" : "settle"}>
      <div className="page">
        {p ? (
          <>
            <div className="hero-wrap">
              <CoverImg category={p.category} className="hero-banner" />
              <BackButton fallback="/ideas" />
            </div>
            <div className="flex gap-8 items-center mb-8">
              <span className="badge badge-neutral">{categoryLabels[p.category]}</span>
              {p.isMatch && <span className="badge badge-green">מאצ&apos;!</span>}
              {p.archived && <span className="badge badge-neutral">בארכיון</span>}
            </div>
            <h1 className="page-title">{p.title}</h1>
            {p.subtitle && <p className="page-subtitle">{p.subtitle}</p>}
          </>
        ) : (
          <>
            <div className="skeleton skeleton-cover skeleton-hero" />
            <div className="flex gap-8 mb-12">
              <div className="skeleton rounded-pill" style={{ width: 72, height: 22 }} />
              <div className="skeleton rounded-pill" style={{ width: 58, height: 22 }} />
            </div>
            <div className="skeleton skeleton-title" style={{ width: "75%", height: 24 }} />
            <div className="skeleton skeleton-line mb-20" style={{ width: "50%" }} />
          </>
        )}

        <div className="card mb-12">
          <div className="skeleton skeleton-line mb-12" style={{ width: "40%" }} />
          <Lines widths={["90%", "80%"]} />
        </div>
        <div className="skeleton rounded-pill" style={{ height: 48 }} />
      </div>
    </PageTransition>
  );
}

// אותה גיאומטריה כמו PlanDetail.tsx.
export function PlanSkeleton() {
  const p = usePreview("plan");
  return (
    <PageTransition skeleton={p ? "none" : "settle"}>
      <div className="page">
        {p ? (
          <>
            {p.category ? (
              <div className="hero-wrap">
                <CoverImg category={p.category} className="hero-banner" />
                <BackButton fallback="/plans" />
              </div>
            ) : (
              <BackButton fallback="/plans" className="hero-back is-inline" />
            )}
            <div className="flex gap-8 items-center mb-8">
              <PlanStatusBadge status={p.status} startsAt={p.startsAt} />
            </div>
            <h1 className="page-title">{p.title}</h1>
            <p className="page-subtitle">
              {formatPlanWhen(p.startsAt)}
              {p.meetingPlace ? ` · ${p.meetingPlace}` : ""}
            </p>
          </>
        ) : (
          <>
            <div className="skeleton skeleton-cover skeleton-hero" />
            <div className="skeleton rounded-pill mb-12" style={{ width: 90, height: 22 }} />
            <div className="skeleton skeleton-title" style={{ width: "70%", height: 24 }} />
            <div className="skeleton skeleton-line mb-20" style={{ width: "50%" }} />
          </>
        )}

        <div className="card">
          <div className="skeleton skeleton-line mb-12" style={{ width: "40%" }} />
          <Lines widths={["80%", "60%"]} />
        </div>
      </div>
    </PageTransition>
  );
}

// אותה גיאומטריה כמו app/(app)/memories/[id]/page.tsx. בתצוגה המקדימה:
// תמונת השער בלבד (הממוזערת כבר בטלפון מהרשימה — MemoryHero מציג אותה
// כרקע עד שהגדולה נטענת); שאר התמונות והנקודות מגיעות עם הדף.
export function MemorySkeleton() {
  const p = usePreview("memory");
  return (
    <PageTransition skeleton={p ? "none" : "settle"}>
      <div className="page">
        {p ? (
          <>
            <MemoryHero
              photoIds={p.coverPhotoId ? [p.coverPhotoId] : []}
              fallbackCategory={p.category}
              title={p.title}
              dateLabel={p.dateLabel}
            />
            <p className="status-msg m-0 mb-16 text-sm">
              מתוך{" "}
              <Link href={`/plans/${p.planId}`} className="link-plain text-sm">
                התוכנית המקורית &larr;
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="skeleton mhero" style={{ borderRadius: 0 }} />
            <div className="skeleton skeleton-line mb-16" style={{ width: 130, height: 12 }} />
          </>
        )}
        <div className="card">
          <div className="skeleton skeleton-line mb-12" style={{ width: 60, height: 12 }} />
          <Lines widths={["95%", "88%", "60%"]} />
        </div>
      </div>
    </PageTransition>
  );
}

const DETAIL: Record<PreviewKind, () => React.ReactNode> = {
  idea: IdeaSkeleton,
  plan: PlanSkeleton,
  memory: MemorySkeleton,
};

// שלד של רשימה/בית (27.9). כשלוחצים על פריט רגע אחרי שהמסך עלה, לפני ש-Next
// הספיק לטעון מראש את מבנה דף הפרטים, הוא מציג את השלד של המסך שממנו
// יצאנו — כלומר שלד של רשימה, בזמן שנכנסים לפריט. במקרה הזה (לחיצה קדימה
// על פריט עם תצוגה מקדימה) מציגים את שלד הפריט במקום.
export function DetailOrListSkeleton({ list }: { list: React.ReactNode }) {
  const [kind] = useState<PreviewKind | null>(() =>
    typeof document !== "undefined" && document.documentElement.getAttribute("data-nav") === "forward"
      ? (getRecentPreview()?.kind ?? null)
      : null,
  );
  const Detail = kind ? DETAIL[kind] : null;
  return Detail ? <Detail /> : list;
}
