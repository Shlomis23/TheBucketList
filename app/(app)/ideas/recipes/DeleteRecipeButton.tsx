"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteRecipeAction } from "./actions";
export function DeleteRecipeButton({ id, version, title }: { id: string; version: number; title: string }) {
  const router = useRouter();
  const lock = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await deleteRecipeAction({ id, expectedVersion: version });
      if (!result.ok) setError(result.error.message);
      else { router.replace("/ideas/recipes"); router.refresh(); }
    } catch { setError("המחיקה לא הושלמה. נסו שוב."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="mt-24">
    {confirming ? <div className="delete-confirm">
      <p className="m-0 text-sm break-anywhere">למחוק את &quot;{title}&quot; מהספר המשותף? המתכון יימחק לשניכם ולא יהיה ניתן לשחזר אותו.</p>
      <div className="flex gap-8 justify-center mt-8">
        <button className="btn btn-danger" disabled={busy} onClick={remove}>{busy ? "מוחקים…" : "מחיקה"}</button>
        <button className="btn btn-outline" disabled={busy} onClick={() => setConfirming(false)}>ביטול</button>
      </div>
    </div> : <button className="link-plain c-danger" onClick={() => setConfirming(true)}>מחיקת המתכון</button>}
    {error && <p className="alert-error" role="alert">{error}</p>}
  </div>;
}
