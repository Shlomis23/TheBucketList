import Link from "next/link";
import { PageTransition } from "@/components/PageTransition";
import { listRecipes } from "@/lib/dal/recipes";
import { RecipeList } from "./RecipeList";
export default async function RecipesPage() {
  const recipes = await listRecipes();
  return <PageTransition kind="list"><div className="page">
    <Link href="/ideas" className="link-plain inline-block mb-12">→ רעיונות</Link>
    <div className="flex items-center justify-between gap-8 mb-12">
      <h1 className="page-title mb-0">ספר המתכונים</h1>
      <Link href="/ideas/recipes/new" className="btn btn-primary">+ מתכון</Link>
    </div>
    <p className="page-subtitle">המתכונים ששומרים ביחד, גם לדברים הקטנים.</p>
    <RecipeList recipes={recipes} />
  </div></PageTransition>;
}
