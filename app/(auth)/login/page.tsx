import { LoginForm } from "./LoginForm";

// כניסה `/login` — F1/F2, spec סעיף 5, 6, 9.1.
// עיצוב (25.9, "אופציה א"): מסך פתיחה של אפליקציה — חלק עליון סגול עם
// האייקון של האפליקציה (אותו אייקון שבמסך הבית של הטלפון), השם והמשפט, ומתחתיו
// "גיליון" עם הטופס. error=link_expired מגיע מ-/auth/callback דרך searchParams.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string }>;
}) {
  const { error, deleted } = await searchParams;

  return (
    <div className="auth-screen">
      <header className="auth-hero">
        <span className="auth-star" style={{ top: "18%", right: "16%" }} />
        <span className="auth-star" style={{ top: "30%", left: "12%" }} />
        <span className="auth-star" style={{ top: "44%", right: "8%" }} />
        <span className="auth-star is-small" style={{ top: "16%", left: "36%" }} />
        <span className="auth-star is-small" style={{ top: "52%", left: "24%" }} />
        {/* eslint-disable-next-line @next/next/no-img-element -- אייקון האפליקציה (SVG סטטי) */}
        <img src="/icons/icon.svg" alt="" className="auth-logo" width={92} height={92} />
        <h1 className="auth-title" dir="ltr">
          The Bucket List
        </h1>
        <p className="auth-tagline">כל מה שבא לכם לעשות ביחד — במקום אחד</p>
      </header>

      <main className="auth-sheet">
        {deleted === "1" && (
          <p role="status" className="auth-notice">
            החשבון נמחק. תודה על הזמן ביחד.
          </p>
        )}
        <h2 className="auth-sheet-title">כניסה</h2>
        <p className="auth-sheet-sub">בלי סיסמה — נשלח לך קוד למייל</p>
        <LoginForm initialError={error} />
      </main>
    </div>
  );
}
