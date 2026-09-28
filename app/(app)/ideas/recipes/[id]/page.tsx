import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { recipeClassificationText } from "@/lib/recipes";
import { getRecipe } from "@/lib/dal/recipes";
import { PageTransition } from "@/components/PageTransition";
import { DeleteRecipeButton } from "../DeleteRecipeButton";
export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  return <PageTransition kind="detail"><div className="page">
    <div className="flex justify-between items-center gap-8 mb-12">
      <Link className="link-plain" href="/ideas/recipes">→ ספר המתכונים</Link>
      <Link className="link-plain" href={`/ideas/recipes/${id}/edit`}>עריכה</Link>
    </div>
    <h1 className="page-title break-anywhere">{recipe.title}</h1>
    {recipeClassificationText(recipe) && <p className="status-msg text-sm">{recipeClassificationText(recipe)}</p>}
    {recipe.source_url && <a className="btn btn-outline mt-12 mb-16" href={recipe.source_url} target="_blank" rel="noopener noreferrer">פתיחת המתכון המקורי ↗</a>}
    {recipe.body && <section className="card mt-16"><h2 className="text-lg mt-0 mb-12">המתכון</h2><p className="pre-wrap break-anywhere leading-loose m-0">{recipe.body}</p></section>}
    {recipe.note && <section className="card mt-16"><h2 className="text-lg mt-0 mb-12">ההערה שלנו</h2><p className="pre-wrap break-anywhere m-0">{recipe.note}</p></section>}
    {!recipe.body && !recipe.note && !recipe.source_url && <p className="status-msg">אפשר להוסיף קישור או פרטים דרך עריכה.</p>}
    <DeleteRecipeButton id={id} title={recipe.title} version={recipe.version} />
  </div></PageTransition>;
}
