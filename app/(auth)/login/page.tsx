import { LoginForm } from "./LoginForm";
import { loginHeroImage } from "@/lib/covers";

// כניסה `/login` — F1/F2, spec סעיף 5, 6, 9.1.
// error=link_expired מגיע מ-/auth/callback דרך searchParams (Next.js),
// לא מ-window.location בצד לקוח — נמנע מ-setState בתוך useEffect.
// תמונת ה-hero היא SVG עיצוב קבוע (lib/covers.ts), לא תמונה פרטית.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string }>;
}) {
  const { error, deleted } = await searchParams;

  return (
    <div className="page" style={{ paddingTop: "calc(28px + var(--safe-area-top))" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי מ-public, לא תוכן דינמי */}
      <img src={loginHeroImage} alt="" className="hero-banner" />
      <p className="page-eyebrow">The Bucket List</p>
      <h1 className="page-title">כניסה</h1>
      <p className="page-subtitle">רשימת החוויות שלכם, שנייכם.</p>
      {deleted === "1" && (
        <p role="status" className="card" style={{ margin: "0 0 12px", fontSize: 14 }}>
          החשבון נמחק. תודה על הזמן ביחד.
        </p>
      )}
      <div className="card">
        <LoginForm initialError={error} />
      </div>
    </div>
  );
}
