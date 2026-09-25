"use client";

// מועד תוכנית — "מתי" ו"עד", כל אחד כשני שדות צרים: תאריך + שעה.
//
// למה לא datetime-local (25.9, צילום מסך מהאייפון של שלומי): בעברית הפקד
// מציג "20 בספט׳ 2026 בשעה 19:30" ורוחבו הטבעי באייפון גדול מהכרטיס.
// התיקון הקודם (overflow-x: hidden על .field) רק גזם את הצד השמאלי של
// התיבה במקום לפתור. שני שדות צרים נכנסים ברוחב המסך, והבחירה בטלפון
// (לוח שנה / גלגלת שעות) נוחה יותר.
//
// ב-DB לא השתנה כלום: התאריך והשעה מתאחדים ל-ISO אחד, כמו קודם.

export type DateTimeParts = { date: string; time: string };

const pad = (n: number) => String(n).padStart(2, "0");

// ISO -> שדות, לפי שעון המכשיר (כמו isoToLocalInput שהיה קודם).
export function isoToParts(iso: string | null): DateTimeParts {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// שדות -> ISO. שניהם ריקים = אין מועד (תקין, המועד אופציונלי בשלב ההצעה).
// רק אחד מהם = שגיאה ברורה, במקום לנחש שעה (00:00 היה מציג "חצות").
export function partsToIso(p: DateTimeParts): { iso?: string; error?: string } {
  if (!p.date && !p.time) return {};
  if (!p.date) return { error: "חסר תאריך" };
  if (!p.time) return { error: "חסרה שעה" };
  const d = new Date(`${p.date}T${p.time}`);
  if (Number.isNaN(d.getTime())) return { error: "תאריך או שעה לא תקינים" };
  return { iso: d.toISOString() };
}

// "עד" מתמלא אוטומטית בתאריך של "מתי". אם לא נבחרה לו שעה והתאריך זהה
// להתחלה, זה בסך הכול המילוי האוטומטי — כלומר "אין שעת סיום", לא שגיאה.
export function endPartsToIso(start: DateTimeParts, end: DateTimeParts): { iso?: string; error?: string } {
  if (!end.time && (!end.date || end.date === start.date)) return {};
  return partsToIso(end);
}

function PartsRow({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: DateTimeParts;
  onChange: (next: DateTimeParts) => void;
  error?: string;
}) {
  return (
    <fieldset className="datetime-field">
      <legend>{label}</legend>
      <div className="datetime-row">
        <input
          id={`${id}-date`}
          type="date"
          aria-label={`${label} — תאריך`}
          className="input datetime-date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          aria-invalid={Boolean(error)}
        />
        <input
          id={`${id}-time`}
          type="time"
          step={300}
          aria-label={`${label} — שעה`}
          className="input datetime-time"
          value={value.time}
          onChange={(e) => onChange({ ...value, time: e.target.value })}
          aria-invalid={Boolean(error)}
        />
      </div>
      {error && (
        <p role="alert" className="alert-error" style={{ marginTop: 6 }}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function DateTimeRangeFields({
  idPrefix,
  start,
  end,
  onStartChange,
  onEndChange,
  startLabel = "מתי",
  endLabel = "עד",
  startError,
  endError,
}: {
  idPrefix: string;
  start: DateTimeParts;
  end: DateTimeParts;
  onStartChange: (next: DateTimeParts) => void;
  onEndChange: (next: DateTimeParts) => void;
  startLabel?: string;
  endLabel?: string;
  startError?: string;
  endError?: string;
}) {
  return (
    <>
      <PartsRow
        id={`${idPrefix}-start`}
        label={startLabel}
        value={start}
        error={startError}
        onChange={(next) => {
          // "עד" נוטה להיות באותו יום — כשבוחרים תאריך התחלה, תאריך הסיום
          // מתמלא איתו, אלא אם כבר בחרו לו תאריך אחר במכוון.
          if (next.date !== start.date && (!end.date || end.date === start.date)) {
            onEndChange({ ...end, date: next.date });
          }
          onStartChange(next);
        }}
      />
      <PartsRow id={`${idPrefix}-end`} label={endLabel} value={end} error={endError} onChange={onEndChange} />
      <p className="status-msg" style={{ margin: "-6px 0 0", fontSize: 12.5 }}>
        בוחרים תאריך ושעה — או משאירים ריק ומשלימים אחר כך.
      </p>
    </>
  );
}
