"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Recipe } from "@/lib/dal/recipes";
import { saveRecipeAction } from "./actions";

export function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const router = useRouter();
  const [id] = useState(() => recipe?.id ?? crypto.randomUUID());
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const back = recipe ? `/ideas/recipes/${recipe.id}` : "/ideas/recipes";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    inFlight.current = true; setBusy(true); setError(""); setFields({});
    try {
      const result = await saveRecipeAction({ id, expectedVersion: recipe?.version ?? null,
        title: data.get("title"), sourceUrl: data.get("sourceUrl"), body: data.get("body"), note: data.get("note") });
      if (!result.ok) { setError(result.error.message); setFields(result.error.fieldErrors ?? {}); }
      else { router.replace(`/ideas/recipes/${result.data.id}`); router.refresh(); }
    } catch { setError("השמירה לא הושלמה. בדקו את החיבור ונסו שוב."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <form className="flex flex-col gap-16" onSubmit={submit} aria-busy={busy}>
    <div className="field"><label htmlFor="recipe-title">שם המתכון</label>
      <input id="recipe-title" name="title" className="input" required maxLength={120} defaultValue={recipe?.title} aria-invalid={!!fields.title} />
      {fields.title && <p className="alert-error" role="alert">{fields.title[0]}</p>}
    </div>
    <div className="field"><label htmlFor="recipe-source">קישור למתכון (לא חובה)</label>
      <input id="recipe-source" name="sourceUrl" type="url" dir="ltr" className="input" placeholder="https://" maxLength={2048} defaultValue={recipe?.source_url ?? ""} aria-invalid={!!fields.sourceUrl} />
      {fields.sourceUrl && <p className="alert-error" role="alert">{fields.sourceUrl[0]}</p>}
    </div>
    <div className="field"><label htmlFor="recipe-body">המתכון (לא חובה)</label>
      <textarea id="recipe-body" name="body" className="textarea" rows={8} maxLength={20000} defaultValue={recipe?.body} placeholder="מצרכים ואופן הכנה" />
    </div>
    <div className="field"><label htmlFor="recipe-note">הערה משותפת (לא חובה)</label>
      <textarea id="recipe-note" name="note" className="textarea" rows={3} maxLength={3000} defaultValue={recipe?.note} placeholder="מה כדאי לזכור לפעם הבאה?" />
    </div>
    {error && <p role="alert" className="alert-error">{error}</p>}
    <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "שומרים…" : "שמירת המתכון"}</button>
    <Link className="link-plain text-center" href={back}>ביטול</Link>
  </form>;
}
