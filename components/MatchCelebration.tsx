"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { markMatchesSeenAction } from "@/app/(app)/match-actions";

// רגע המאצ' — מסך חגיגה מלא (26.9, אפשרות ב; 0030). יושב ב-(app)/layout:
//   1. מי שהשלים את המאצ': ReactionControl שולח MATCH_EVENT מיד אחרי השמירה.
//   2. בן/בת הזוג: ה-layout מעביר מאצ'ים שעוד לא נחגגו (unseen) — בפתיחה או
//      ברענון (AppLifecycle). מסמנים "נראה" מיד כשהמסך מוצג, כך שהוא מופיע
//      פעם אחת בלבד. כמה מאצ'ים יחד -> האחרון, ו"עוד N" לרשימת המאצ'ים.
// "הפחתת תנועה" בטלפון: בלי קונפטי ובלי אנימציות (globals.css).

export const MATCH_EVENT = "bucket:match";

type Match = { id: string; title: string };
type Shown = Match & { more: number };

function initial(name: string) {
  return Array.from(name.trim())[0] ?? "";
}

const CONFETTI = [
  { right: "10%", color: "#fef1cf", delay: 0.2 },
  { right: "24%", color: "#ffe1e9", delay: 0.6 },
  { right: "38%", color: "#ddf3e4", delay: 0.35 },
  { right: "52%", color: "#fef1cf", delay: 0.9 },
  { right: "66%", color: "#ffe1e9", delay: 0.45 },
  { right: "80%", color: "#f3edff", delay: 1.1 },
  { right: "92%", color: "#ddf3e4", delay: 0.75 },
];

export function MatchCelebration({
  me,
  partner,
  unseen,
}: {
  me: string;
  partner: string;
  unseen: Match[];
}) {
  const [shown, setShown] = useState<Shown | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // מאצ'ים חדשים מה-layout (בן/בת הזוג). עדכון state בזמן רינדור כשה-prop
  // משתנה — הדפוס של React במקום effect; הסימון בשרת נעשה ב-effect למטה.
  const unseenKey = unseen.map((m) => m.id).join(",");
  const [seenKey, setSeenKey] = useState("");
  if (unseenKey && unseenKey !== seenKey) {
    setSeenKey(unseenKey);
    setShown({ ...unseen[0], more: unseen.length - 1 });
  }

  useEffect(() => {
    if (!seenKey) return;
    void markMatchesSeenAction(seenKey.split(","));
  }, [seenKey]);

  // מי שהשלים את המאצ' עכשיו (כבר מסומן "נראה" בשרת).
  useEffect(() => {
    function onMatch(e: Event) {
      const m = (e as CustomEvent<Match>).detail;
      if (m?.id) setShown({ ...m, more: 0 });
    }
    window.addEventListener(MATCH_EVENT, onMatch);
    return () => window.removeEventListener(MATCH_EVENT, onMatch);
  }, []);

  useEffect(() => {
    if (!shown) return;
    navigator.vibrate?.([30, 60, 90]); // אנדרואיד; באייפון אין רטט מהדפדפן
    dialogRef.current?.focus(); // לקוראי מסך; בלי טבעת פוקוס על הכפתור
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShown(null);
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [shown]);

  if (!shown) return null;
  const close = () => setShown(null);

  return (
    <div ref={dialogRef} tabIndex={-1} className="match-overlay" role="dialog" aria-modal="true" aria-labelledby="match-title">
      {CONFETTI.map((c, i) => (
        <i
          key={i}
          className="match-confetti"
          aria-hidden="true"
          style={{ right: c.right, background: c.color, animationDelay: `${c.delay}s` }}
        />
      ))}
      <div className="match-duo" aria-hidden="true">
        <span className="match-av me">{initial(me) || "?"}</span>
        <span className="match-av partner">{initial(partner) || "?"}</span>
        <span className="match-heart">
          <svg width="28" height="28" viewBox="0 0 24 24">
            <path
              d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.3 5 6.6 5c2 0 3.4 1.1 4.4 2.6C12 6.1 13.4 5 15.4 5 18.7 5 21 8.3 19.5 11.8 17.5 16.4 12 21 12 21z"
              fill="#d6426f"
            />
          </svg>
        </span>
      </div>
      <h2 id="match-title" className="match-title">
        מאצ&apos;!
      </h2>
      <p className="match-sub">שניכם רוצים את זה</p>
      <p className="match-idea">{shown.title}</p>
      <div className="match-actions">
        <Link href={`/plans/new?ideaId=${shown.id}`} className="btn btn-block match-btn-primary" onClick={close}>
          בואו נקבע מועד
        </Link>
        <button type="button" className="btn btn-block match-btn-later" onClick={close}>
          אחר כך
        </button>
        {shown.more > 0 && (
          <Link href="/ideas?view=matches" className="match-more" onClick={close}>
            {shown.more === 1 ? "ועוד מאצ' חדש אחד" : `ועוד ${shown.more} מאצ'ים חדשים`} &larr;
          </Link>
        )}
      </div>
    </div>
  );
}
