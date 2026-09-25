"use client";

import { useEffect, useId, useRef, useState } from "react";

// שדה "מקום" עם השלמה מ-Google Maps (25.9). מקלידים — מופיעות עד 5 הצעות;
// בחירה שומרת גם place_id (ניווט מדויק). אפשר תמיד להתעלם מההצעות ולכתוב
// טקסט חופשי ("אצל ההורים", "איפשהו בצפון") — אז פשוט אין place_id.
// כל שינוי בטקסט אחרי בחירה מנתק את ה-place_id: הטקסט כבר לא בהכרח
// אותו מקום.
//
// חיסכון בקריאות: רק מ-2 תווים, אחרי 350ms בלי הקלדה, בקשה קודמת מבוטלת,
// ותוצאות נשמרות בזיכרון הדף (מחיקת אות וחזרה לא שולחת שוב). מושב
// (sessionToken) אחד מההקלדה הראשונה ועד הבחירה — כך Google מחייבת.

type Suggestion = { placeId: string; main: string; secondary: string };

const MIN_CHARS = 2;
const DEBOUNCE_MS = 350;

export function PlaceInput({
  id,
  value,
  placeId,
  onChange,
  maxLength = 200,
}: {
  id: string;
  value: string;
  placeId: string | null;
  onChange: (text: string, placeId: string | null) => void;
  maxLength?: number;
}) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const cacheRef = useRef(new Map<string, Suggestion[]>());
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  function search(text: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    const q = text.trim();
    if (q.length < MIN_CHARS || unavailable) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    const cached = cacheRef.current.get(q);
    if (cached) {
      setSuggestions(cached);
      setOpen(cached.length > 0);
      setActive(-1);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      sessionRef.current ??= crypto.randomUUID();
      try {
        const res = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q, sessionToken: sessionRef.current }),
          signal: controller.signal,
        });
        if (!res.ok) {
          // מכסה/תקלה: מפסיקים לנסות עד רענון הדף; השדה נשאר טקסט חופשי.
          if (res.status === 429 || res.status === 503) setUnavailable(true);
          setSuggestions([]);
          setOpen(false);
          return;
        }
        const json = (await res.json()) as { suggestions?: Suggestion[] };
        const list = json.suggestions ?? [];
        cacheRef.current.set(q, list);
        setSuggestions(list);
        setOpen(list.length > 0);
        setActive(-1);
      } catch {
        // abort (אות חדשה) או רשת — בשקט.
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    }, DEBOUNCE_MS);
  }

  function pick(s: Suggestion) {
    const text = (s.secondary ? `${s.main}, ${s.secondary}` : s.main).slice(0, maxLength);
    onChange(text, s.placeId);
    setOpen(false);
    setSuggestions([]);
    // המושב נסגר בבחירה; הקלדה חדשה = מושב חדש.
    sessionRef.current = null;
  }

  return (
    <div className="place-input">
      <input
        id={id}
        className="input"
        maxLength={maxLength}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="חיפוש מקום או כתובת, או טקסט חופשי"
        onChange={(e) => {
          onChange(e.target.value, null);
          search(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0 && !placeId) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault(); // לא לשלוח את הטופס — לבחור את ההצעה
            pick(suggestions[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {open && suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="place-list">
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "place-option is-active" : "place-option"}
              // mousedown ולא click: כדי שה-blur של השדה לא יסגור את הרשימה לפני הבחירה.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
            >
              <span className="place-main">{s.main}</span>
              {s.secondary && <span className="place-secondary">{s.secondary}</span>}
            </li>
          ))}
          <li className="place-attribution" aria-hidden="true">
            powered by Google
          </li>
        </ul>
      )}

      {placeId ? (
        <p className="place-hint is-linked">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          מקום מגוגל מפות · הניווט יגיע בדיוק לשם
        </p>
      ) : loading ? (
        <p className="place-hint">מחפש…</p>
      ) : unavailable ? (
        <p className="place-hint">החיפוש לא זמין כרגע — אפשר לכתוב חופשי</p>
      ) : null}
    </div>
  );
}
