// כניסה `/login` — spec סעיף 5 (F1/F2), 6, 9.1.
// TODO: טופס אימייל -> שליחת magic link דרך Supabase Auth.
// למנוע שליחה חוזרת בזמן בקשה; הודעת שגיאה כללית בלי לחשוף קיום חשבון.
export default function LoginPage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>כניסה</h1>
      <p>רשימת החוויות שלכם, שנייך. נכניס כאן טופס אימייל + קישור מאובטח.</p>
    </div>
  );
}
