"use client";

import { useRef, useState, useTransition } from "react";
import { addCommentAction, deleteCommentAction, editCommentAction } from "@/app/(app)/ideas/actions";
import { COMMENT_MAX, shortLinkLabel, tokenizeLinks } from "@/lib/validation/comment";
import type { CommentDto } from "@/lib/dal/comments";

// "שיחה על הרעיון" — תגובות טקסט (spec 6.1: 1–1,000 תווים, גלוי לשניהם,
// רק המחבר עורך/מוחק, בלי עיצוב עשיר). ההודעות עצמן מגיעות מהשרת כ-props;
// אחרי כל פעולה ה-Server Action עושה revalidatePath והרשימה מתעדכנת מעצמה —
// אין כאן state מקומי של הודעות שיכול להתפצל ממה שבשרת.
// בלי זמן אמת: הודעה של הצד השני מופיעה בכניסה/רענון הבא (שלב מתקדם באפיון).

const COUNTER_FROM = 800; // המונה מופיע רק כשמתקרבים לגבול

// קישורים הופכים ללחיצים (tokenizeLinks — https בכל רישיות, www., דומיין
// מוכר). React מבריח את הטקסט, וה-href תמיד https:// + כתובת — אין HTML חופשי.
function renderBody(text: string) {
  return tokenizeLinks(text).map((t, i) =>
    t.type === "text" ? (
      <span key={i}>{t.value}</span>
    ) : (
      <a key={i} href={t.href} target="_blank" rel="noopener noreferrer nofollow" dir="ltr" className="msg-link">
        {shortLinkLabel(t.value)}
      </a>
    ),
  );
}

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
}

export function IdeaConversation({
  ideaId,
  comments,
  canPost,
}: {
  ideaId: string;
  comments: CommentDto[];
  canPost: boolean;
}) {
  const [draft, setDraft] = useState("");
  // requestId קבוע לאותה טיוטה — לחיצה כפולה/retry לא יוצרים כפילות (add_comment
  // אידמפוטנטי). מתחדש רק אחרי שליחה מוצלחת.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = draft.trim();

  function send() {
    if (!trimmed || trimmed.length > COMMENT_MAX || pending) return;
    setError("");
    startTransition(async () => {
      const result = await addCommentAction({ requestId, ideaId, body: trimmed });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setDraft("");
      setRequestId(crypto.randomUUID());
      requestAnimationFrame(() => autoGrow(composerRef.current));
    });
  }

  function saveEdit(c: CommentDto) {
    const body = editText.trim();
    if (!body || body.length > COMMENT_MAX || pending) return;
    setError("");
    startTransition(async () => {
      const result = await editCommentAction({ ideaId, commentId: c.id, expectedVersion: c.version, body });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setEditingId(null);
    });
  }

  function remove(c: CommentDto) {
    setError("");
    startTransition(async () => {
      const result = await deleteCommentAction({ ideaId, commentId: c.id, expectedVersion: c.version });
      if (!result.ok) setError(result.error.message);
      setConfirmDeleteId(null);
    });
  }

  return (
    <section className="card mb-16" aria-labelledby="conversation">
      <div className="flex justify-between items-center mb-12">
        <p id="conversation" className="page-eyebrow m-0">
          שיחה על הרעיון
        </p>
        {comments.length > 0 && (
          <span className="status-msg text-xs">
            {comments.length === 1 ? "הודעה אחת" : `${comments.length} הודעות`}
          </span>
        )}
      </div>

      {comments.length === 0 ? (
        <p className="status-msg m-0 text-sm">
          {canPost
            ? "עוד אין הודעות. מצאתם תאריך, מחיר או משהו שכדאי לדעת? כתבו כאן."
            : "לא נכתבו הודעות על הרעיון הזה."}
        </p>
      ) : (
        <ul className="thread" aria-live="polite">
          {comments.map((c) => (
            <li key={c.id} className={c.isMine ? "msg-row mine" : "msg-row theirs"}>
              {editingId === c.id ? (
                <div className="w-full">
                  <textarea
                    className="textarea"
                    aria-label="עריכת ההודעה"
                    value={editText}
                    maxLength={COMMENT_MAX + 50}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{ minHeight: 70 }}
                    autoFocus
                  />
                  <div className="msg-meta mt-8">
                    <button type="button" className="link-plain msg-action" disabled={pending} onClick={() => saveEdit(c)}>
                      שמירה
                    </button>
                    <button type="button" className="link-plain msg-action" onClick={() => setEditingId(null)}>
                      ביטול
                    </button>
                    {editText.trim().length > COUNTER_FROM && (
                      <span style={{ color: editText.trim().length > COMMENT_MAX ? "var(--color-danger)" : undefined }}>
                        {editText.trim().length}/{COMMENT_MAX}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className={c.isMine ? "msg mine" : "msg theirs"}>{renderBody(c.body)}</div>
                  <div className="msg-meta">
                    <span>
                      {c.authorName} · {c.whenLabel}
                      {c.edited ? " · נערך" : ""}
                    </span>
                    {c.isMine && canPost && confirmDeleteId !== c.id && (
                      <>
                        <button
                          type="button"
                          className="link-plain msg-action"
                          onClick={() => {
                            setEditingId(c.id);
                            setEditText(c.body);
                            setConfirmDeleteId(null);
                          }}
                        >
                          עריכה
                        </button>
                        <button type="button" className="link-plain msg-action" onClick={() => setConfirmDeleteId(c.id)}>
                          מחיקה
                        </button>
                      </>
                    )}
                    {confirmDeleteId === c.id && (
                      <>
                        <span className="c-text">למחוק?</span>
                        <button
                          type="button"
                          className="link-plain msg-action c-danger"
                          disabled={pending}
                          onClick={() => remove(c)}
                        >
                          כן, למחוק
                        </button>
                        <button type="button" className="link-plain msg-action" onClick={() => setConfirmDeleteId(null)}>
                          ביטול
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="alert-error mt-12">
          {error}
        </p>
      )}

      {canPost && (
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            ref={composerRef}
            className="composer-input"
            aria-label="כתיבת הודעה"
            placeholder="כתיבת הודעה…"
            rows={1}
            value={draft}
            maxLength={COMMENT_MAX + 50}
            onChange={(e) => {
              setDraft(e.target.value);
              autoGrow(e.target);
            }}
            onKeyDown={(e) => {
              // Enter = שורה חדשה (נוח בטלפון); Ctrl/Cmd+Enter = שליחה במחשב.
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            type="submit"
            className="composer-send"
            aria-label="שליחה"
            disabled={pending || !trimmed || trimmed.length > COMMENT_MAX}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
        </form>
      )}
      {canPost && trimmed.length > COUNTER_FROM && (
        <p
          className="status-msg m-0 mt-4 text-xs"
          style={{ color: trimmed.length > COMMENT_MAX ? "var(--color-danger)" : undefined }}
        >
          {trimmed.length}/{COMMENT_MAX}
        </p>
      )}
    </section>
  );
}
