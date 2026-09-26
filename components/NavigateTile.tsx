"use client";

import { useState } from "react";
import { googleMapsUrl, wazeUrl } from "@/lib/navLinks";

// "ניווט" למקום של רעיון — לחיצה שואלת Waze או Google Maps (בחירה של שלומי).
// שני הקישורים הם universal links: נפתחים באפליקציה אם מותקנת, אחרת בדפדפן.
//
// עם place_id (מקום שנבחר מההשלמה, 0019):
//   - Google Maps: query_place_id — בדיוק המקום, לא חיפוש טקסט.
//   - Waze: קואורדינטות, שנשלפות ברגע שבחירת הניווט נפתחת (לא נשמרות —
//     תנאי Google). עד שהן מגיעות (או אם נכשל) — חיפוש לפי הטקסט, כמו קודם.
// בלי place_id (טקסט חופשי / רעיון ישן): חיפוש לפי הטקסט בשתיהן.

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function NavigateTile({
  place,
  placeId,
  className,
}: {
  place: string;
  placeId: string | null;
  className?: string;
}) {
  const [choosing, setChoosing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fetched, setFetched] = useState(false);

  function open() {
    setChoosing(true);
    if (placeId && !fetched) {
      setFetched(true);
      fetch(`/api/places/location?id=${encodeURIComponent(placeId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { lat?: number; lng?: number } | null) => {
          if (j && typeof j.lat === "number" && typeof j.lng === "number") setCoords({ lat: j.lat, lng: j.lng });
        })
        .catch(() => {});
    }
  }

  const waze = wazeUrl(place, coords);
  const google = googleMapsUrl(place, placeId);

  return choosing ? (
    <div className={`link-tile nav-choice${className ? ` ${className}` : ""}`} role="group" aria-label={`ניווט אל ${place}`}>
      <span className="link-tile-text c-text">
        לנווט עם:
      </span>
      <a href={waze} target="_blank" rel="noopener noreferrer" className="nav-option" onClick={() => setChoosing(false)}>
        Waze
      </a>
      <a href={google} target="_blank" rel="noopener noreferrer" className="nav-option" onClick={() => setChoosing(false)}>
        Google Maps
      </a>
      <button type="button" className="link-plain text-sm min-w-0" style={{ minHeight: 36 }} onClick={() => setChoosing(false)}>
        ביטול
      </button>
    </div>
  ) : (
    <button type="button" className={`link-tile${className ? ` ${className}` : ""}`} onClick={open} aria-expanded={false}>
      <PinIcon />
      <span className="link-tile-text">{place} · ניווט</span>
    </button>
  );
}
