"use client";

// תקלה ב-layout הראשי עצמו — המסך הזה מחליף את כל הדף (כולל html/body), ולכן
// בלי ה-CSS הגלובלי: עיצוב מינימלי inline, באותם צבעים.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          background: "#faf8ff",
          color: "#241b3a",
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: 380, width: "100%" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>משהו השתבש</h1>
          <p style={{ margin: "0 0 22px", color: "#6e6584", lineHeight: 1.6 }}>
            זו תקלה אצלנו, לא משהו שעשיתם. בדרך כלל ניסיון נוסף מספיק.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              width: "100%",
              minHeight: 48,
              border: 0,
              borderRadius: 999,
              background: "#5b3e9e",
              color: "#fff",
              font: "inherit",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            לנסות שוב
          </button>
        </main>
      </body>
    </html>
  );
}
