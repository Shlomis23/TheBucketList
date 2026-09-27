// ראש מסך הבית (27.9, כיוון ג' מההדמיות): סמל הדלי + "שלומי וגואל" (קודם מי
// שמשתמש — lib/validation/home.ts coupleTitle) + "הרשימה שלנו". במקום התווית
// "The Bucket List", שהייתה קטנה ונשברה לפעמים לשתי שורות. השם באנגלית נשאר
// באייקון, במסך הפתיחה ובמסך ההתחברות.
export function HomeBrand({ title }: { title: string }) {
  return (
    <div className="home-brand">
      <BrandMark />
      <span className="home-brand-text">
        <span className="home-brand-names">{title}</span>
        <span className="home-brand-sub">הרשימה שלנו</span>
      </span>
    </div>
  );
}

// הסמל מהאייקון (app/icon.svg), בצבע של ערכת הצבע הנוכחית (--color-primary)
// — כך שבערכה כחולה/טורקיז הוא לא נשאר סגול.
function BrandMark() {
  return (
    <svg className="home-brand-mark" viewBox="0 0 1024 1024" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="home-brand-bg" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--color-primary)" }} />
          <stop offset="1" style={{ stopColor: "color-mix(in srgb, var(--color-primary) 62%, #000)" }} />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="230" fill="url(#home-brand-bg)" />
      <circle cx="170" cy="170" r="260" fill="#fff" opacity="0.08" />
      <path d="M318 440 C 318 250, 706 250, 706 440" fill="none" stroke="#f3edff" strokeWidth="44" strokeLinecap="round" />
      <path d="M276 432 H748 Q770 432 767 454 L716 790 Q712 818 684 818 H340 Q312 818 308 790 L257 454 Q254 432 276 432 Z" fill="#fff" />
      <rect x="240" y="410" width="544" height="64" rx="32" fill="#fff" />
      <path
        d="M512 742 C 452 700, 408 664, 408 614 C 408 580, 434 556, 466 556 C 488 556, 504 568, 512 584 C 520 568, 536 556, 558 556 C 590 556, 616 580, 616 614 C 616 664, 572 700, 512 742 Z"
        fill="#d6426f"
      />
    </svg>
  );
}
