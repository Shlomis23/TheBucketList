import { LoginForm } from "./LoginForm";

// כניסה `/login` — F1/F2, spec סעיף 5, 6, 9.1.
// error=link_expired מגיע מ-/auth/callback דרך searchParams (Next.js),
// לא מ-window.location בצד לקוח — נמנע מ-setState בתוך useEffect.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="page" style={{ paddingTop: "calc(48px + var(--safe-area-top))" }}>
      <p className="page-eyebrow">The Bucket List</p>
      <h1 className="page-title">כניסה</h1>
      <p className="page-subtitle">רשימת החוויות שלכם, שנייכם.</p>
      <div className="card">
        <LoginForm initialError={error} />
      </div>
    </div>
  );
}
