// שלד הסבב — אותו רקע ומבנה כמו ReviewDeck, בלי תוכן (בלי הבזק של רשימה).
export default function Loading() {
  return (
    <div className="review" aria-busy="true" aria-label="טוען">
      <div className="review-top">
        <span className="review-close" aria-hidden="true" />
        <span className="review-count">סבב החלטות</span>
        <span className="review-close-spacer" />
      </div>
      <div className="review-progress" />
      <div className="review-stage">
        <div className="review-card skeleton-card" />
      </div>
    </div>
  );
}
