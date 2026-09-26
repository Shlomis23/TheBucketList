import Link from "next/link";
import { NavigateTile } from "@/components/NavigateTile";
import { linkHost, shortLinkLabel } from "@/lib/validation/comment";

// "מהרעיון" בדף התוכנית (25.9): הקישור והמיקום יושבים ברעיון, וכדי להגיע
// אליהם ביום עצמו היה צריך לעבור דרך לשונית הרעיונות. כאן הם במרחק לחיצה.
// מוצג רק מה שקיים; אם אין כלום — רק "לרעיון המלא".
//
// ניווט: NavigateTile (Waze / Google Maps, מדויק כשיש place_id).

function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function FromIdeaCard({
  ideaId,
  sourceUrl,
  locationText,
  placeId,
  conversationLinks,
}: {
  ideaId: string;
  sourceUrl: string | null;
  locationText: string | null;
  placeId: string | null;
  conversationLinks: string[];
}) {
  const place = locationText?.trim() || null;
  const hasLinks = Boolean(sourceUrl || place || conversationLinks.length);

  return (
    <section className="card mb-16" aria-labelledby="from-idea">
      <div className="flex justify-between items-center" style={{ marginBottom: hasLinks ? 12 : 0 }}>
        <p id="from-idea" className="page-eyebrow m-0">
          מהרעיון
        </p>
        <Link href={`/ideas/${ideaId}`} className="link-plain text-sm">
          לרעיון המלא &larr;
        </Link>
      </div>

      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="link-tile primary">
          <ExternalIcon />
          {/* שתי שורות: טקסט עברי למעלה, שם האתר (LTR) מתחת — כך אף אחד מהם
              לא נחתך מהצד הלא נכון במסך צר. */}
          <span className="link-tile-text flex flex-col" style={{ whiteSpace: "normal" }}>
            <span>קישור מהרעיון</span>
            <span className="text-right text-xs fw-600 c-muted"
              dir="ltr"
              style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {linkHost(sourceUrl)}
            </span>
          </span>
        </a>
      )}

      {place && <NavigateTile place={place} placeId={placeId} />}

      {conversationLinks.length > 0 && (
        <>
          <p className="status-msg m-0 mt-4 mb-8 text-xs">
            קישורים מהשיחה
          </p>
          {conversationLinks.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer nofollow" className="link-tile">
              <ExternalIcon />
              {/* כתובת בלבד: השורה כולה LTR, כדי שה-"…" ייחתך בסוף הכתובת ולא
                  בתחילתה (ב-RTL החיתוך נופל על ההתחלה — "ntim.co.il" במקום "eventim"). */}
              <span className="link-tile-text text-right" dir="ltr">
                {shortLinkLabel(url, 60)}
              </span>
            </a>
          ))}
        </>
      )}
    </section>
  );
}
