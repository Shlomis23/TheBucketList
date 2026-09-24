"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    initialError ? "error" : "idle",
  );
  const [errorMsg, setErrorMsg] = useState(
    initialError === "link_expired"
      ? "הקישור פג תוקף או כבר נוצל. אפשר לבקש קישור חדש."
      : "",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMsg("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setErrorMsg("לא הצלחנו לשלוח את הקישור. נסו שוב בעוד רגע.");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return <p role="status">שלחנו קישור כניסה ל-{email}. לוחצים על הקישור כדי להיכנס.</p>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16, maxWidth: 360 }}
    >
      <label htmlFor="email">אימייל</label>
      <input
        id="email"
        name="email"
        type="email"
        dir="ltr"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ minHeight: 44, padding: "0 12px", border: "1px solid var(--color-border)" }}
      />
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "שולח..." : "שליחת קישור כניסה"}
      </button>
      {status === "error" && (
        <p role="alert" style={{ color: "var(--color-primary)" }}>
          {errorMsg}
        </p>
      )}
    </form>
  );
}
