"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction, sendReauthCodeAction } from "@/app/account/actions";

// אימות מחדש: קוד חדש למייל של החשבון המחובר, ורק איתו המחיקה עוברת —
// כך מי שמחזיק רגע את הטלפון לא יכול למחוק את החשבון.
export function DeleteAccountForm({ immediate }: { immediate: boolean }) {
  const [step, setStep] = useState<"start" | "code">("start");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function sendCode() {
    setError("");
    startTransition(async () => {
      const result = await sendReauthCodeAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setMaskedEmail(result.data.maskedEmail);
      setStep("code");
    });
  }

  if (step === "start") {
    return (
      <>
        <p className="status-msg" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
          כדי לוודא שזה באמת את/ה, נשלח קוד למייל של החשבון.
        </p>
        {error && (
          <p role="alert" className="alert-error" style={{ marginBottom: 10 }}>
            {error}
          </p>
        )}
        <button type="button" className="btn btn-block btn-danger-outline" onClick={sendCode} disabled={pending}>
          {pending ? "שולח…" : "שליחת קוד למחיקת החשבון"}
        </button>
      </>
    );
  }

  const valid = /^\d{6,10}$/.test(code.trim());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || pending) return;
        setError("");
        startTransition(async () => {
          const result = await deleteAccountAction(code);
          if (result && !result.ok) setError(result.error.message);
        });
      }}
    >
      <div className="field">
        <label htmlFor="delete-code">הקוד שנשלח ל-<span dir="ltr">{maskedEmail}</span></label>
        <input
          id="delete-code"
          className="input"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          dir="ltr"
          style={{ textAlign: "center", letterSpacing: 4, fontSize: 20 }}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {error && (
        <p role="alert" className="alert-error" style={{ marginTop: 10 }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-block btn-danger" disabled={!valid || pending} style={{ marginTop: 12 }}>
        {pending ? "מוחק…" : immediate ? "מחיקת החשבון לצמיתות" : "מחיקת החשבון"}
      </button>
      <button type="button" className="link-plain" style={{ marginTop: 10, fontSize: 13 }} onClick={sendCode} disabled={pending}>
        לא הגיע? שליחה מחדש
      </button>
    </form>
  );
}
