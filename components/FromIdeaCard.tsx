"use client";

import { useState } from "react";
import Link from "next/link";
import { linkHost, shortLinkLabel } from "@/lib/validation/comment";

// "מהרעיון" בדף התוכנית (25.9): הקישור והמיקום יושבים ברעיון, וכדי להגיע
// אליהם ביום עצמו היה צריך לעבור דרך לשונית הרעיונות. כאן הם במרחק לחיצה.
// מוצג רק מה שקיים; אם אין כלום — רק "לרעיון המלא".
//
// ניווט: לחיצה שואלת Waze או Google Maps (בחירה של שלומי). שני הקישורים
// הם universal links — נפתחים באפליקציה אם מותקנת, אחרת בדפדפן.

function wazeUrl(place: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(place)}&navigate=yes`;
}
function googleMapsUrl(place: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function FromIdeaCard({
  ideaId,
  sourceUrl,
  locationText,
  conversationLinks,
}: {
  ideaId: string;
  sourceUrl: string | null;
  locationText: string | null;
  conversationLinks: string[];
}) {
  const [choosingNav, setChoosingNav] = useState(false);
  const place = locationText?.trim() || null;
  const hasLinks = Boolean(sourceUrl || place || conversationLinks.length);

  return (
    <section className="card" aria-labelledby="from-idea" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasLinks ? 10 : 0 }}>
        <p id="from-idea" className="page-eyebrow" style={{ margin: 0 }}>
          מהרעיון
        </p>
        <Link href={`/ideas/${ideaId}`} className="link-plain" style={{ fontSize: 13 }}>
          לרעיון המלא &larr;
        </Link>
      </div>

      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="link-tile primary">
          <ExternalIcon />
          {/* שתי שורות: טקסט עברי למעלה, שם האתר (LTR) מתחת — כך אף אחד מהם
              לא נחתך מהצד הלא נכון במסך צר. */}
          <span className="link-tile-text" style={{ display: "flex", flexDirection: "column", whiteSpace: "normal" }}>
            <span>קישור מהרעיון</span>
            <span
              dir="ltr"
              style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {linkHost(sourceUrl)}
            </span>
          </span>
        </a>
      )}

      {place &&
        (choosingNav ? (
          <div className="link-tile nav-choice" role="group" aria-label={`ניווט אל ${place}`}>
            <span className="link-tile-text" style={{ color: "var(--color-text)" }}>
              לנווט עם:
            </span>
            <a href={wazeUrl(place)} target="_blank" rel="noopener noreferrer" className="nav-option" onClick={() => setChoosingNav(false)}>
              Waze
            </a>
            <a href={googleMapsUrl(place)} target="_blank" rel="noopener noreferrer" className="nav-option" onClick={() => setChoosingNav(false)}>
              Google Maps
            </a>
            <button type="button" className="link-plain" style={{ fontSize: 13, minHeight: 36, minWidth: 0 }} onClick={() => setChoosingNav(false)}>
              ביטול
            </button>
          </div>
        ) : (
          <button type="button" className="link-tile" onClick={() => setChoosingNav(true)} aria-expanded={false}>
            <PinIcon />
            <span className="link-tile-text">{place} · ניווט</span>
          </button>
        ))}

      {conversationLinks.length > 0 && (
        <>
          <p className="status-msg" style={{ margin: "4px 0 6px", fontSize: 12 }}>
            קישורים מהשיחה
          </p>
          {conversationLinks.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer nofollow" className="link-tile">
              <ExternalIcon />
              {/* כתובת בלבד: השורה כולה LTR, כדי שה-"…" ייחתך בסוף הכתובת ולא
                  בתחילתה (ב-RTL החיתוך נופל על ההתחלה — "ntim.co.il" במקום "eventim"). */}
              <span className="link-tile-text" dir="ltr" style={{ textAlign: "right" }}>
                {shortLinkLabel(url, 60)}
              </span>
            </a>
          ))}
        </>
      )}
    </section>
  );
}
