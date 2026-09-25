"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePhotoAction } from "@/app/(app)/memories/actions";
import type { PhotoDto } from "@/lib/dal/photos";

// תמונות הזיכרון — גריד, העלאה וצפייה במסך מלא ("אופציה א", 25.9).
//
// העלאה: כל תמונה מוקטנת קודם בטלפון (עד 2048px, JPEG) — תמונת אייפון של
// 3–5MB יורדת לכמה מאות KB, ההעלאה מהירה גם בסלולרי ונכנסת בתקרת 4MB של
// השרת. השרת מקודד מחדש בכל מקרה (הסרת מיקום GPS וכו'), כך שההקטנה כאן
// היא למהירות, לא לאבטחה. תמונות עולות אחת-אחת, עם מצב לכל אחת.
//
// צפייה: לחיצה על תמונה פותחת מסך מלא; החלקה/חצים בין התמונות. מחיקה רק
// לתמונות שהעליתי (נאכף גם בשרת) — מהצפייה, או ממצב "עריכה" בגריד.

const MAX = 10;
const CLIENT_EDGE = 2048;
const UPLOAD_LIMIT = 4 * 1024 * 1024;

type QueueItem = {
  key: string;
  preview: string;
  status: "waiting" | "uploading" | "done" | "error";
  error?: string;
};

const thumbUrl = (id: string) => `/api/photos/${id}/content?v=thumb`;
const fullUrl = (id: string) => `/api/photos/${id}/content`;

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Safari ישן / פורמט ש-createImageBitmap לא מכיר — דרך <img>.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function prepareImage(file: File): Promise<Blob> {
  let source: Awaited<ReturnType<typeof decode>>;
  try {
    source = await decode(file);
  } catch {
    // הדפדפן לא מצליח לפענח (למשל HEIC באנדרואיד). אם זה בכל זאת פורמט
    // שהשרת מקבל וגודל סביר — שולחים כמו שהוא; אחרת הודעה ברורה.
    if (["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= UPLOAD_LIMIT) return file;
    throw new Error("הפורמט של התמונה הזו לא נתמך. נסו לבחור אותה שוב מהגלריה, או צילום מסך שלה");
  }

  const scale = Math.min(1, CLIENT_EDGE / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("לא הצלחנו לעבד את התמונה");
  ctx.fillStyle = "#fff"; // PNG שקוף -> לבן
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  if ("close" in source && typeof source.close === "function") source.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("לא הצלחנו לעבד את התמונה");
  if (blob.size > UPLOAD_LIMIT) throw new Error("התמונה גדולה מדי");
  return blob;
}

async function uploadOne(memoryId: string, file: File): Promise<void> {
  const body = await prepareImage(file);
  let res: Response;
  try {
    res = await fetch(`/api/memories/${memoryId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream", "X-Request-Id": crypto.randomUUID() },
      body,
    });
  } catch {
    throw new Error("אין חיבור. נסו שוב");
  }
  if (res.ok) return;
  let message = "ההעלאה נכשלה, נסו שוב";
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    if (json.error?.message) message = json.error.message;
  } catch {
    if (res.status === 413) message = "התמונה גדולה מדי";
  }
  throw new Error(message);
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function MemoryPhotos({ memoryId, photos }: { memoryId: string; photos: PhotoDto[] }) {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  // מצב "עריכה" (25.9): מחיקה ישירות מהגריד, בלי לפתוח כל תמונה. רק תמונות
  // שהעליתי מקבלות כפתור מחיקה — כך נאכף גם בשרת (begin_delete_photo).
  const [editing, setEditing] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, startDelete] = useTransition();
  const hasMine = photos.some((p) => p.isMine);

  function deleteFromGrid(photoId: string) {
    setDeleteError("");
    setDeletingId(photoId);
    startDelete(async () => {
      const result = await deletePhotoAction({ memoryId, photoId });
      setConfirmId(null);
      if (!result.ok) {
        setDeletingId(null);
        setDeleteError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  // תמונות שהסתיימו נשארות כתצוגה מקדימה עד שהרשימה מהשרת מתעדכנת —
  // כך אין "הבהוב" בין סיום ההעלאה להופעת התמונה האמיתית.
  // (עדכון state בזמן רינדור כשה-props משתנים — הדפוס שמומלץ ב-React במקום effect.)
  const photoKey = photos.map((p) => p.id).join(",");
  const [seenKey, setSeenKey] = useState(photoKey);
  if (seenKey !== photoKey) {
    setSeenKey(photoKey);
    setQueue((q) => q.filter((i) => i.status !== "done"));
    setDeletingId(null);
    // אין יותר תמונות שלי למחוק -> יוצאים ממצב עריכה.
    if (!photos.some((p) => p.isMine)) setEditing(false);
  }

  const active = queue.filter((i) => i.status !== "error").length;
  const remaining = Math.max(0, MAX - photos.length - active);

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0 || busy) return;
    const files = Array.from(list).slice(0, remaining);
    const skipped = list.length - files.length;
    if (files.length === 0) return;

    const items: QueueItem[] = files.map((f) => ({
      key: crypto.randomUUID(),
      preview: URL.createObjectURL(f),
      status: "waiting",
    }));
    setQueue((q) => [...q.filter((i) => i.status !== "error"), ...items]);
    setBusy(true);

    let anyDone = false;
    for (let n = 0; n < files.length; n++) {
      const key = items[n].key;
      setQueue((q) => q.map((i) => (i.key === key ? { ...i, status: "uploading" } : i)));
      try {
        await uploadOne(memoryId, files[n]);
        anyDone = true;
        setQueue((q) => q.map((i) => (i.key === key ? { ...i, status: "done" } : i)));
      } catch (e) {
        const message = e instanceof Error ? e.message : "ההעלאה נכשלה";
        setQueue((q) => q.map((i) => (i.key === key ? { ...i, status: "error", error: message } : i)));
      }
    }
    if (skipped > 0) {
      setQueue((q) => [
        ...q,
        { key: crypto.randomUUID(), preview: "", status: "error", error: `אפשר עד ${MAX} תמונות לזיכרון — ${skipped} לא נוספו` },
      ]);
    }
    setBusy(false);
    if (anyDone) startTransition(() => router.refresh());
  }

  const errors = queue.filter((i) => i.status === "error");
  const pendingTiles = queue.filter((i) => i.status !== "error" && i.preview);
  const uploadingCount = queue.filter((i) => i.status === "waiting" || i.status === "uploading").length;
  const total = photos.length;

  return (
    <section className="card" aria-labelledby="memory-photos" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p id="memory-photos" className="page-eyebrow" style={{ margin: 0 }}>
          תמונות
        </p>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="status-msg" style={{ fontSize: 12 }} aria-live="polite">
            {uploadingCount > 0 ? `מעלה… (${uploadingCount})` : total > 0 ? `${total} מתוך ${MAX}` : ""}
          </span>
          {hasMine && uploadingCount === 0 && (
            <button
              type="button"
              className="link-plain"
              style={{ fontSize: 13, minHeight: 32, minWidth: 0 }}
              onClick={() => {
                setEditing((v) => !v);
                setConfirmId(null);
                setDeleteError("");
              }}
            >
              {editing ? "סיום" : "עריכה"}
            </button>
          )}
        </span>
      </div>
      {editing && (
        <p className="status-msg" style={{ margin: "-4px 0 10px", fontSize: 12.5 }}>
          לוחצים על ה-X כדי למחוק תמונה.
          {photos.some((p) => !p.isMine) && " תמונות שהעלה/תה בן/בת הזוג (המעומעמות) — רק הם יכולים למחוק."}
        </p>
      )}

      {total === 0 && pendingTiles.length === 0 ? (
        <button type="button" className="photo-empty" onClick={() => inputRef.current?.click()} disabled={busy}>
          <CameraIcon />
          <span>הוספת תמונות מהיום הזה</span>
          <span className="status-msg" style={{ fontSize: 12, margin: 0 }}>
            עד {MAX} תמונות · שניכם יכולים להוסיף
          </span>
        </button>
      ) : (
        <ul className="photo-grid">
          {photos.map((p, i) =>
            editing ? (
              <li key={p.id}>
                <div className={p.isMine ? "photo-tile" : "photo-tile is-locked"}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית דרך route מאומת, לא next/image */}
                  <img src={thumbUrl(p.id)} alt="" loading="lazy" decoding="async" />
                  {p.isMine && deletingId === p.id ? (
                    <span className="photo-spinner" />
                  ) : p.isMine && confirmId === p.id ? (
                    <div className="photo-confirm">
                      <button type="button" className="photo-confirm-yes" disabled={deleting} onClick={() => deleteFromGrid(p.id)}>
                        למחוק
                      </button>
                      <button type="button" className="photo-confirm-no" disabled={deleting} onClick={() => setConfirmId(null)}>
                        ביטול
                      </button>
                    </div>
                  ) : p.isMine ? (
                    <button
                      type="button"
                      className="photo-del"
                      aria-label={`מחיקת תמונה ${i + 1}`}
                      disabled={deleting}
                      onClick={() => setConfirmId(p.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </li>
            ) : (
              <li key={p.id}>
                <button type="button" className="photo-tile" onClick={() => setViewerIndex(i)} aria-label={`תמונה ${i + 1} מתוך ${total}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית דרך route מאומת, לא next/image */}
                  <img src={thumbUrl(p.id)} alt="" loading="lazy" decoding="async" />
                </button>
              </li>
            ),
          )}
          {pendingTiles.map((item) => (
            <li key={item.key}>
              <div className="photo-tile is-pending" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- תצוגה מקדימה מקומית (blob:) */}
                <img src={item.preview} alt="" />
                {item.status !== "done" && <span className="photo-spinner" />}
              </div>
            </li>
          ))}
          {remaining > 0 && !editing && (
            <li>
              <button type="button" className="photo-tile photo-add" onClick={() => inputRef.current?.click()} disabled={busy} aria-label="הוספת תמונות">
                <CameraIcon />
                <span>הוספה</span>
              </button>
            </li>
          )}
        </ul>
      )}

      {deleteError && (
        <p role="alert" className="alert-error" style={{ marginTop: 10 }}>
          {deleteError}
        </p>
      )}

      {errors.map((e) => (
        <p key={e.key} role="alert" className="alert-error" style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ flex: 1 }}>{e.error}</span>
          <button
            type="button"
            className="link-plain"
            style={{ fontSize: 12, minHeight: 32, minWidth: 0 }}
            onClick={() => {
              if (e.preview) URL.revokeObjectURL(e.preview);
              setQueue((q) => q.filter((i) => i.key !== e.key));
            }}
          >
            סגירה
          </button>
        </p>
      ))}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = ""; // לאפשר לבחור שוב את אותו קובץ
        }}
      />

      {viewerIndex !== null && photos[viewerIndex] && (
        <PhotoViewer
          memoryId={memoryId}
          photos={photos}
          index={viewerIndex}
          onIndex={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </section>
  );
}

function PhotoViewer({
  memoryId,
  photos,
  index,
  onIndex,
  onClose,
}: {
  memoryId: string;
  photos: PhotoDto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const touchX = useRef<number | null>(null);
  const photo = photos[index];
  const count = photos.length;

  // RTL: "הבאה" משמאל. החלקה ימינה (כמו דפדוף בספר עברי) = הבאה.
  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < count) {
        setConfirming(false);
        setError("");
        onIndex(next);
      }
    },
    [index, count, onIndex],
  );

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(1);
      if (e.key === "ArrowRight") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose]);

  function remove() {
    setError("");
    startTransition(async () => {
      const result = await deletePhotoAction({ memoryId, photoId: photo.id });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setConfirming(false);
      if (count <= 1) onClose();
      else if (index >= count - 1) onIndex(index - 1);
      router.refresh();
    });
  }

  return (
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`תמונה ${index + 1} מתוך ${count}`}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx > 0 ? 1 : -1);
      }}
    >
      <div className="viewer-bar">
        <button type="button" className="viewer-btn" onClick={onClose} aria-label="סגירה">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <span className="viewer-count">
          {index + 1} מתוך {count}
        </span>
        {photo.isMine ? (
          confirming ? (
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button type="button" className="viewer-btn danger" onClick={remove} disabled={pending}>
                {pending ? "מוחק…" : "למחוק"}
              </button>
              <button type="button" className="viewer-btn" onClick={() => setConfirming(false)} disabled={pending}>
                ביטול
              </button>
            </span>
          ) : (
            <button type="button" className="viewer-btn" onClick={() => setConfirming(true)} aria-label="מחיקת התמונה" style={{ gap: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
              </svg>
              מחיקה
            </button>
          )
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <div className="viewer-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {/* eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית דרך route מאומת */}
        <img key={photo.id} src={fullUrl(photo.id)} alt="" className="viewer-img" style={{ backgroundImage: `url(${thumbUrl(photo.id)})` }} />
      </div>

      {error && (
        <p role="alert" className="viewer-error">
          {error}
        </p>
      )}

      {count > 1 && (
        <>
          {index > 0 && (
            <button type="button" className="viewer-nav prev" onClick={() => go(-1)} aria-label="התמונה הקודמת">
              ›
            </button>
          )}
          {index < count - 1 && (
            <button type="button" className="viewer-nav next" onClick={() => go(1)} aria-label="התמונה הבאה">
              ‹
            </button>
          )}
        </>
      )}
    </div>
  );
}
