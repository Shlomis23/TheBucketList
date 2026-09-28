import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getRecipe } from "@/lib/dal/recipes";
import { PageTransition } from "@/components/PageTransition";
import { RecipeForm } from "../../RecipeForm";
export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  return <PageTransition kind="detail"><div className="page">
    <Link className="link-plain inline-block mb-12" href={`/ideas/recipes/${id}`}>→ חזרה למתכון</Link>
    <h1 className="page-title mb-16">עריכת מתכון</h1>
    <div className="card"><RecipeForm recipe={recipe} /></div>
  </div></PageTransition>;
}
