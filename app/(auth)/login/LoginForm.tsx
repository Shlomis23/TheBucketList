"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// כניסה במייל — קוד בן 6 ספרות (עיקרי) + קישור (גיבוי).
//
// למה קוד ולא רק קישור (25.9, אחרי ששלומי ננעל מחוץ לאפליקציה):
// קישור כניסה עובד פעם אחת ורק בדפדפן שביקש אותו (PKCE). באייפון הוא
// נשבר בקלות — תצוגה מקדימה בלחיצה ארוכה "משתמשת" בו, אפליקציית Gmail
// פותחת אותו בדפדפן פנימי, ואפליקציה במסך הבית שומרת התחברות בנפרד
// מהדפדפן. קוד מוקלד כאן, באותו מקום שביקש אותו — עובד בכל המקרים.
// דורש ש-{{ .Token }} יופיע בתבנית "Magic Link" ב-Supabase.

const RESEND_COOLDOWN_SECONDS = 60;

type SendError = { status?: number; code?: string; message?: string };

// מיפוי שגיאות Supabase להודעה שאומרת מה לעשות, לא רק "נכשל".
function sendErrorMessage(error: SendError): { text: string; waitSeconds: number } {
  const msg = error.message ?? "";
  if (error.status === 429 || error.code === "over_email_send_rate_limit") {
    const seconds = Number(msg.match(/after (\d+) seconds?/)?.[1]);
    if (seconds > 0) {
      return { text: `כבר נשלח מייל ממש עכשיו. אפשר לבקש חדש בעוד ${seconds} שניות — בינתיים כדאי לבדוק את המייל.`, waitSeconds: seconds };
    }
    return {
      text: "נשלחו יותר מדי מיילי כניסה בזמן קצר. נסו שוב בעוד כמה דקות, ובינתיים השתמשו בקוד מהמייל האחרון שקיבלתם.",
      waitSeconds: 0,
    };
  }
  return { text: "לא הצלחנו לשלוח את המייל. בדקו את הכתובת ונסו שוב.", waitSeconds: 0 };
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState(
    initialError === "link_expired"
      ? "הקישור כבר נוצל או נפתח בדפדפן אחר מזה שביקש אותו. הכי פשוט: לבקש מייל חדש ולהקליד כאן את הקוד שבו."
      : "",
  );
  // הכתובת שאליה נשלח המייל — מוצגת בתוך <bdi> כדי שכתובת LTR לא תתבלגן בתוך משפט עברי.
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendEmail() {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setErrorMsg("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);

    if (error) {
      const { text, waitSeconds } = sendErrorMessage(error);
      setErrorMsg(text);
      if (waitSeconds > 0) setCooldown(waitSeconds);
      return;
    }
    setStep("code");
    setCode("");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setSentTo(email.trim());
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (busy || token.length < 6) return;
    setBusy(true);
    setErrorMsg("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });

    if (error) {
      setBusy(false);
      setErrorMsg(
        error.status === 429
          ? "יותר מדי ניסיונות. חכו דקה ונסו שוב."
          : "הקוד שגוי או שפג תוקפו. ודאו שזה הקוד מהמייל האחרון, או בקשו מייל חדש.",
      );
      return;
    }
    // כמו ב-/auth/callback: /onboarding כבר מנתב ל-"/" כשיש מרחב, ול-
    // /invite/continue כשיש cookie הזמנה. ה-session כבר ב-cookies (הלקוח
    // כתב אותם), אז הבקשה הבאה לשרת מגיעה מחוברת. busy נשאר true עד המעבר.
    router.replace("/onboarding");
    router.refresh();
  }

  if (step === "code") {
    return (
      <form className="flex flex-col gap-16" onSubmit={verifyCode}>
        {sentTo && (
          <div role="status" className="status-msg m-0">
            שלחנו מייל עם קוד לכתובת:
            <div className="fw-700 c-text text-right m-0 mt-2 mb-2" dir="ltr">
              {sentTo}
            </div>
            אם הוא לא מופיע תוך דקה, כדאי לבדוק בספאם.
          </div>
        )}
        <div className="field">
          <label htmlFor="code">הקוד מהמייל</label>
          <input
            id="code"
            name="code"
            className="input text-center text-xl fw-700"
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            style={{ letterSpacing: 6 }}
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || code.length < 6}>
          {busy ? "בודקים…" : "כניסה"}
        </button>
        <p className="status-msg m-0 text-sm">
          אפשר גם ללחוץ על הקישור במייל — אבל רק אם הוא נפתח באותו דפדפן. הקוד עובד תמיד.
        </p>
        {errorMsg && (
          <p role="alert" className="alert-error">
            {errorMsg}
          </p>
        )}
        <div className="flex justify-between gap-12 flex-wrap">
          <button type="button" className="link-plain" onClick={sendEmail} disabled={busy || cooldown > 0}>
            {cooldown > 0 ? `שליחה מחדש בעוד ${cooldown}` : "שליחת מייל חדש"}
          </button>
          <button
            type="button"
            className="link-plain"
            onClick={() => {
              setStep("email");
              setErrorMsg("");
              setSentTo("");
            }}
          >
            שינוי כתובת
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="flex flex-col gap-16"
      onSubmit={(e) => {
        e.preventDefault();
        void sendEmail();
      }}
    >
      <div className="field">
        <label htmlFor="email">אימייל</label>
        <input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          required
          autoComplete="email"
          placeholder="name@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </div>
      {/* לא "מושבת" כשהשדה ריק (נראה שבור) — required של הדפדפן מטפל בזה. */}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy || cooldown > 0}>
        {busy ? "שולחים…" : cooldown > 0 ? `אפשר לשלוח שוב בעוד ${cooldown}` : "שליחת קוד כניסה"}
      </button>
      <p className="status-msg m-0 text-sm">
        בכניסה הראשונה ייפתח לך חשבון אוטומטית.
      </p>
      {errorMsg && (
        <p role="alert" className="alert-error">
          {errorMsg}
        </p>
      )}
    </form>
  );
}
