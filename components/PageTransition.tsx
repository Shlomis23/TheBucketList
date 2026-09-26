import { ViewTransition } from "react";

// מעברים חלקים בין מסכים (26.9) — React <ViewTransition> + View Transitions
// API של הדפדפן (בלי תמיכה: המעבר פשוט מיידי, כמו קודם).
//   list   — בית/רעיונות/תוכניות/זיכרונות/הגדרות: יוצא בהחלקה כשנכנסים
//            לפריט (nav-forward), ובהחלפת לשונית — הצלבה קצרה (nav-tab).
//   detail — רעיון/תוכנית/זיכרון/טפסים/סבב: נכנס בהחלקה (nav-forward), ויוצא
//            בהחלקה חזרה בכל מעבר אחר (כפתור חזרה, "אחורה", לשונית מתוך האזור).
// בכניסה בלי סוג: כלום — כדי שטעינה (שלד -> תוכן) לא תחליק לשום כיוון.
// הסוגים: transitionTypes על הקישורים (nav-forward בכניסה לפריט, nav-tab
// בניווט התחתון). CSS: app/styles/screens.css ("מעברים").
const LIST = {
  enter: { "nav-tab": "nav-tab", default: "none" },
  exit: { "nav-forward": "nav-forward", "nav-tab": "nav-tab", default: "none" },
};
const DETAIL = {
  enter: { "nav-forward": "nav-forward", default: "none" },
  exit: { "nav-forward": "nav-forward", "nav-tab": "nav-tab", default: "nav-back" },
};

export function PageTransition({ kind, children }: { kind: "list" | "detail"; children: React.ReactNode }) {
  const t = kind === "list" ? LIST : DETAIL;
  return (
    <ViewTransition enter={t.enter} exit={t.exit} default="none">
      {children}
    </ViewTransition>
  );
}
