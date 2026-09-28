"use client";
import Link from "next/link";
import { useState } from "react";
import type { Recipe } from "@/lib/dal/recipes";
import { recipeMatchesFilters } from "@/lib/validation/recipe";
import { recipeCourses, recipeClassifications, courseLabels, classificationLabels, recipeClassificationText } from "@/lib/recipes";
import { EmptyState } from "@/components/EmptyState";

export function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("");
  const [classification, setClassification] = useState("");
  function reset() { setQuery(""); setCourse(""); setClassification(""); }
  const visible = recipes.filter((recipe) => recipeMatchesFilters(recipe, query, course, classification));
  if (!recipes.length) return <EmptyState title="עוד אין מתכונים בספר שלכם" action={<Link href="/ideas/recipes/new" className="btn btn-primary">שמירת המתכון הראשון</Link>} />;
  return <>
    <input className="input mb-12" type="search" aria-label="חיפוש מתכון" placeholder="חיפוש בשם, במתכון או בהערה…" value={query} maxLength={100} onChange={(e) => setQuery(e.target.value)} />
    <div className="flex flex-wrap gap-8 mb-12">
      <select className={`chip chip-select${course ? " is-set" : ""}`} aria-label="סינון לפי סוג מנה" value={course} onChange={e => setCourse(e.target.value)}>
        <option value="">כל סוגי המנות</option>
        {recipeCourses.map(value => <option key={value} value={value}>{courseLabels[value]}</option>)}
        <option value="unclassified">ללא סוג מנה</option>
      </select>
      <select className={`chip chip-select${classification ? " is-set" : ""}`} aria-label="סינון לפי סיווג" value={classification} onChange={e => setClassification(e.target.value)}>
        <option value="">כל הסיווגים</option>
        {recipeClassifications.map(value => <option key={value} value={value}>{classificationLabels[value]}</option>)}
        <option value="unclassified">ללא סיווג</option>
      </select>
    </div>
    {visible.length > 0 && (query || course || classification) && <button className="link-plain mb-12" onClick={reset}>ניקוי החיפוש והסינון</button>}
    <p className="status-msg text-xs mb-12" aria-live="polite">{visible.length === 1 ? "מתכון אחד" : `${visible.length} מתכונים`}</p>
    {visible.length ? visible.map((recipe) => <Link key={recipe.id} href={`/ideas/recipes/${recipe.id}`} className="card block no-underline c-text mb-8">
      <h2 className="text-base fw-700 m-0 break-anywhere">{recipe.title}</h2>
      {recipeClassificationText(recipe) && <p className="status-msg text-xs m-0 mt-4">{recipeClassificationText(recipe)}</p>}
      {recipe.note && <p className="status-msg text-sm m-0 mt-4 break-anywhere">{recipe.note.length > 100 ? `${recipe.note.slice(0, 100)}…` : recipe.note}</p>}
    </Link>) : <EmptyState title="אין מתכונים שמתאימים לחיפוש" action={<button className="btn btn-outline" onClick={reset}>ניקוי החיפוש והסינון</button>} />}
  </>;
}
