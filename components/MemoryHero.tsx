"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OPEN_PHOTO_EVENT } from "@/components/MemoryPhotos";

// באנר עליון בדף זיכרון (26.9): התמונה היא הגיבורה. כל התמונות בגלילה
// אופקית (scroll-snap — החלקה טבעית בטלפון), נקודות למטה, ולחיצה פותחת את
// הצפייה במסך מלא של MemoryPhotos. בלי תמונות — איור הקטגוריה, באותה צורה.
export function MemoryHero({
  photoIds,
  fallbackSrc,
  title,
  dateLabel,
}: {
  photoIds: string[];
  fallbackSrc: string | null;
  title: string;
  dateLabel: string;
}) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    // RTL: scrollLeft שלילי בכרום/ספארי — לוקחים ערך מוחלט.
    setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  }

  function goTo(i: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: -i * el.clientWidth, behavior: "smooth" });
  }

  function back() {
    if (window.history.length > 1) router.back();
    else router.push("/memories");
  }

  return (
    <div className="mhero">
      {photoIds.length > 0 ? (
        <div ref={scroller} className="mhero-scroller" onScroll={onScroll}>
          {photoIds.map((id, i) => (
            <button
              key={id}
              type="button"
              className="mhero-slide"
              onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PHOTO_EVENT, { detail: i }))}
              aria-label={`תמונה ${i + 1} מתוך ${photoIds.length}, פתיחה במסך מלא`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית דרך route מאומת, לא next/image */}
              <img
                src={`/api/photos/${id}/content`}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                style={{ backgroundImage: `url(/api/photos/${id}/content?v=thumb)` }}
              />
            </button>
          ))}
        </div>
      ) : (
        fallbackSrc && (
          // eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה
          <img src={fallbackSrc} alt="" className="mhero-fallback" />
        )
      )}
      <span className="mhero-shade" aria-hidden="true" />
      <button type="button" className="mhero-back" onClick={back} aria-label="חזרה">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      <div className="mhero-meta">
        <p className="mhero-date">{dateLabel}</p>
        <h1 className="mhero-title">{title}</h1>
      </div>
      {photoIds.length > 1 && (
        <div className="mhero-dots" role="tablist" aria-label="תמונות">
          {photoIds.map((id, i) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`תמונה ${i + 1}`}
              className={i === index ? "on" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
