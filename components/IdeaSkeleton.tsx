"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { CoverImg } from "@/components/CoverImg";
import { PageTransition } from "@/components/PageTransition";
import { getPreview, getRecentPreview } from "@/lib/nav/preview";
import { categoryLabels } from "@/lib/validation/idea";

// שלד הטעינה של דף רעיון (27.9). אם נכנסו מרשימה שהשאירה תצוגה מקדימה —
// החלק העליון זהה לדף האמיתי (איור, כפתור חזרה, באדג'ים, שם, מחיר/משך),
// כך שכשהתוכן מגיע הוא לא זז; רק מה שמתחת מתמלא. אחרת — שלד רגיל.
export function IdeaSkeleton() {
  // לפי הכתובת ולא useParams: שלד הטעינה יושב מעל הסגמנט [id], ושם id עוד
  // לא קיים ב-params. נקרא פעם אחת בעלייה (טבלה בזיכרון, לא מצב שמשתנה).
  const pathname = usePathname();
  const [preview] = useState(() => getPreview(pathname));

  return (
    <PageTransition skeleton={preview ? "none" : "settle"}>
      <div className="page">
        {preview ? (
          <>
            <div className="hero-wrap">
              <CoverImg category={preview.category} className="hero-banner" />
              <BackButton fallback="/ideas" />
            </div>
            <div className="flex gap-8 items-center mb-8">
              <span className="badge badge-neutral">{categoryLabels[preview.category]}</span>
              {preview.isMatch && <span className="badge badge-green">מאצ&apos;!</span>}
              {preview.archived && <span className="badge badge-neutral">בארכיון</span>}
            </div>
            <h1 className="page-title">{preview.title}</h1>
            {preview.subtitle && <p className="page-subtitle">{preview.subtitle}</p>}
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
          <div className="skeleton skeleton-line mb-8" style={{ width: "90%" }} />
          <div className="skeleton skeleton-line" style={{ width: "80%" }} />
        </div>

        <div className="skeleton rounded-pill" style={{ height: 48 }} />
      </div>
    </PageTransition>
  );
}

// שלד הטעינה של /ideas (27.9). כשלוחצים על רעיון רגע אחרי שהרשימה עלתה, לפני
// ש-Next הספיק לטעון מראש את מבנה דף הרעיון, הוא מציג את השלד של /ideas —
// כלומר שלד של רשימה, בזמן שנכנסים לרעיון. במקרה הזה (לחיצה קדימה על רעיון
// עם תצוגה מקדימה) מציגים את שלד הרעיון במקום.
export function IdeaOrListSkeleton({ list }: { list: React.ReactNode }) {
  const [idea] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-nav") === "forward" &&
      getRecentPreview() !== null,
  );
  return idea ? <IdeaSkeleton /> : list;
}
