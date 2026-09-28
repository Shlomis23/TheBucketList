"use client";
import Link from "next/link";
import { useState } from "react";
import type { Recipe } from "@/lib/dal/recipes";
import { recipeMatches } from "@/lib/validation/recipe";
import { EmptyState } from "@/components/EmptyState";

export function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [query, setQuery] = useState("");
  const visible = recipes.filter((recipe) => recipeMatches(recipe, query));
  if (!recipes.length) return <EmptyState title="עוד אין מתכונים בספר שלכם" action={<Link href="/ideas/recipes/new" className="btn btn-primary">שמירת המתכון הראשון</Link>} />;
  return <>
    <input className="input mb-12" type="search" aria-label="חיפוש מתכון" placeholder="חיפוש בשם, במתכון או בהערה…" value={query} maxLength={100} onChange={(e) => setQuery(e.target.value)} />
    <p className="status-msg text-xs mb-12" aria-live="polite">{visible.length === 1 ? "מתכון אחד" : `${visible.length} מתכונים`}</p>
    {visible.length ? visible.map((recipe) => <Link key={recipe.id} href={`/ideas/recipes/${recipe.id}`} className="card block no-underline c-text mb-8">
      <h2 className="text-base fw-700 m-0 break-anywhere">{recipe.title}</h2>
      {recipe.note && <p className="status-msg text-sm m-0 mt-4 break-anywhere">{recipe.note.length > 100 ? `${recipe.note.slice(0, 100)}…` : recipe.note}</p>}
    </Link>) : <EmptyState title="אין מתכונים שמתאימים לחיפוש" action={<button className="btn btn-outline" onClick={() => setQuery("")}>ניקוי החיפוש</button>} />}
  </>;
}
