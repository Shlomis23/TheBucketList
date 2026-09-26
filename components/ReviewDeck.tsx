"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setReactionAction } from "@/app/(app)/ideas/actions";
import { CoverImg } from "@/components/CoverImg";
import { MATCH_EVENT } from "@/components/MatchCelebration";
import { goBack } from "@/lib/nav/memory";
import type { IdeaCategory } from "@/lib/validation/idea";
import { swipeDecision, SWIPE_THRESHOLD, tallyAnswers, type ReviewPref } from "@/lib/validation/review";

// "סבב החלטות" (26.9, אפשרות א) — כרטיס מלא, כפתורים גדולים לאגודל, החלקה
// (ימינה = כן, שמאלה = לא). התשובה נשמרת ברקע והכרטיס הבא עולה מיד; אם
// השמירה נכשלה — הרעיון חוזר לסוף התור עם הודעה. "כן" שיצר מאצ' פותח את
// מסך המאצ' הקיים (MatchCelebration) עם "ממשיכים בסבב" במקום "אחר כך".
// התור נשאר מקומי: רענון הדף מהשרת (revalidatePath אחרי כל תגובה) לא
// מאפס אותו באמצע הסבב.
export type ReviewCard = {
  id: string;
  title: string;
  category: IdeaCategory;
  categoryLabel: string;
  meta: string;
  description: string;
  createdAt: string;
  partnerAnswered: boolean;
};

type Match = { id: string; title: string };
const FLY_MS = 220;

export function ReviewDeck({ cards, partnerName }: { cards: ReviewCard[]; partnerName: string | null }) {
  const router = useRouter();
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<{ id: string; pref: ReviewPref }[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flying, setFlying] = useState<ReviewPref | null>(null);
  const drag = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const card = queue[index];
  const next = queue[index + 1];
  const done = !card;

  const close = useCallback(() => goBack(router, "/ideas"), [router]);

  const answer = useCallback(
    (pref: ReviewPref) => {
      if (!card || flying) return;
      setError("");
      setAnswers((a) => [...a, { id: card.id, pref }]);
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      setFlying(pref);
      window.setTimeout(
        () => {
          setIndex((i) => i + 1);
          setFlying(null);
          setDx(0);
        },
        reduce ? 0 : FLY_MS,
      );

      const failed = () => {
        setError(`"${card.title}" לא נשמר — הוא חזר לסוף הסבב`);
        setAnswers((a) => a.filter((x) => x.id !== card.id));
        setQueue((q) => [...q, card]);
      };
      setReactionAction(card.id, pref)
        .then((res) => {
          if (!res.ok) return failed();
          const m = res.data.celebrate;
          if (m) {
            setMatches((list) => [...list, m]);
            window.dispatchEvent(new CustomEvent(MATCH_EVENT, { detail: { ...m, laterLabel: "ממשיכים בסבב" } }));
          }
        })
        .catch(failed);
    },
    [card, flying],
  );

  // מקלדת (מחשב): חצים. Escape — יציאה.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector(".match-overlay")) return;
      if (e.key === "ArrowRight") answer("yes");
      else if (e.key === "ArrowLeft") answer("no");
      else if (e.key === "ArrowUp") answer("maybe");
      else if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [answer, close]);

  function onPointerDown(e: React.PointerEvent) {
    if (flying) return;
    drag.current = { x: e.clientX, y: e.clientY, active: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(mx) < 8 || Math.abs(mx) < Math.abs(my)) return;
      d.active = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    setDx(mx);
  }
  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    setDragging(false);
    const decision = swipeDecision(dx);
    if (decision) answer(decision);
    else setDx(0);
  }

  if (done) {
    return <ReviewDone answers={answers.map((a) => a.pref)} matches={matches} empty={queue.length === 0} onClose={close} />;
  }

  const total = queue.length;
  const flyTransform =
    flying === "yes"
      ? "translateX(130%) rotate(18deg)"
      : flying === "no"
        ? "translateX(-130%) rotate(-18deg)"
        : flying === "maybe"
          ? "translateY(-120%)"
          : `translateX(${dx}px) rotate(${dx / 18}deg)`;
  const yesOpacity = Math.max(0, Math.min(1, dx / SWIPE_THRESHOLD));
  const noOpacity = Math.max(0, Math.min(1, -dx / SWIPE_THRESHOLD));

  return (
    <div className="review" role="dialog" aria-modal="true" aria-label="סבב החלטות">
      <div className="review-top">
        <button type="button" className="review-close" onClick={close} aria-label="סגירה">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <span className="review-count" aria-live="polite">
          סבב החלטות · {index + 1} מתוך {total}
        </span>
        <span className="review-close-spacer" />
      </div>
      <div className="review-progress" aria-hidden="true">
        <i style={{ width: `${(index / total) * 100}%` }} />
      </div>

      <div className="review-stage">
        {next && (
          <div className="review-card is-next" aria-hidden="true">
            <CoverImg category={next.category} className="review-cover" />
          </div>
        )}
        <article
          key={card.id}
          className="review-card"
          style={{ transform: flyTransform, transition: dragging ? "none" : undefined, opacity: flying ? 0 : 1 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="review-stamp yes" style={{ opacity: yesOpacity }} aria-hidden="true">
            כן
          </span>
          <span className="review-stamp no" style={{ opacity: noOpacity }} aria-hidden="true">
            לא
          </span>
          <CoverImg category={card.category} className="review-cover" />
          <div className="review-body">
            <span className="badge badge-neutral">{card.categoryLabel}</span>
            <h2 className="review-title">{card.title}</h2>
            {card.meta && <p className="review-meta">{card.meta}</p>}
            {card.description && <p className="review-desc">{card.description}</p>}
            <div className="review-foot">
              {card.partnerAnswered && <span>כבר יש תשובה מ{partnerName ?? "בן/בת הזוג"}</span>}
              <Link href={`/ideas/${card.id}`} className="review-more">
                לכל הפרטים
              </Link>
            </div>
          </div>
        </article>
      </div>

      {error && (
        <p role="alert" className="review-error">
          {error}
        </p>
      )}

      {/* סדר מימין לשמאל: כן (ימין) · אולי · לא (שמאל) — כמו כיוון ההחלקה
          (ימינה = כן), וכמו שורת התגובה בשאר האפליקציה. */}
      <div className="review-actions">
        <button type="button" className="review-btn yes" onClick={() => answer("yes")} disabled={!!flying}>
          <i aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24">
              <path
                d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.3 5 6.6 5c2 0 3.4 1.1 4.4 2.6C12 6.1 13.4 5 15.4 5 18.7 5 21 8.3 19.5 11.8 17.5 16.4 12 21 12 21z"
                fill="currentColor"
              />
            </svg>
          </i>
          כן
        </button>
        <button type="button" className="review-btn maybe" onClick={() => answer("maybe")} disabled={!!flying}>
          <i aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M4 13c2.5-3 5-3 8 0s5.5 3 8 0" />
            </svg>
          </i>
          אולי
        </button>
        <button type="button" className="review-btn no" onClick={() => answer("no")} disabled={!!flying}>
          <i aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </i>
          לא
        </button>
      </div>
      <p className="review-hint">אפשר גם להחליק: ימינה = כן, שמאלה = לא</p>
    </div>
  );
}

function ReviewDone({
  answers,
  matches,
  empty,
  onClose,
}: {
  answers: ReviewPref[];
  matches: Match[];
  empty: boolean;
  onClose: () => void;
}) {
  const t = tallyAnswers(answers);
  return (
    <div className="review is-done" role="dialog" aria-modal="true" aria-label="סוף הסבב">
      <div className="review-done">
        <div className="review-done-ring" aria-hidden="true">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h2 className="review-done-title">{empty ? "אין רעיונות שמחכים לך" : "סיימת לעבור על הכול"}</h2>
        <p className="review-done-sub">{empty ? "ענית על כל הרעיונות. כשיתווספו חדשים, הם יחכו כאן." : "אין עוד רעיונות שמחכים לך"}</p>
        {!empty && (
          <div className="review-tally">
            <div>
              <b>{t.yes}</b>כן
            </div>
            <div>
              <b>{t.maybe}</b>אולי
            </div>
            <div>
              <b>{t.no}</b>לא
            </div>
          </div>
        )}
        {matches.length > 0 && (
          <p className="review-done-match">
            {matches.length === 1 ? `מאצ' חדש: ${matches[0].title}` : `${matches.length} מאצ'ים חדשים: ${matches.map((m) => m.title).join(", ")}`}
          </p>
        )}
        {matches.length > 0 && (
          <Link href={`/plans/new?ideaId=${matches[0].id}`} className="btn btn-primary btn-block">
            בואו נתחיל לתכנן את זה
          </Link>
        )}
        <button type="button" className={matches.length > 0 ? "link-plain mt-12" : "btn btn-primary btn-block"} onClick={onClose}>
          סיום
        </button>
      </div>
    </div>
  );
}
