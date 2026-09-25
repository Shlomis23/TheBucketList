import Link from "next/link";
import { StatusScreen } from "@/components/StatusScreen";

// 404 — גם לכתובת שלא קיימת, וגם ל-notFound() של רעיון/תוכנית/זיכרון
// שנמחק או שאינו שלכם (אותה תשובה בדיוק — לא חושפים מה קיים אצל אחרים).
export default function NotFound() {
  return (
    <StatusScreen icon="search" title="לא מצאנו את הדף הזה" text="אולי הקישור ישן, או שמה שחיפשתם כבר נמחק או הועבר.">
      <Link href="/" className="btn btn-primary btn-block">
        לדף הבית
      </Link>
    </StatusScreen>
  );
}
