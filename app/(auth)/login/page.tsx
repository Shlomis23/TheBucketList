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
    <div style={{ padding: 16 }}>
      <h1>כניסה</h1>
      <p>רשימת החוויות שלכם, שנייך.</p>
      <LoginForm initialError={error} />
    </div>
  );
}
