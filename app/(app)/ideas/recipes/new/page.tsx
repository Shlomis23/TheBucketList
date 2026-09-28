import Link from "next/link";
import { PageTransition } from "@/components/PageTransition";
import { RecipeForm } from "../RecipeForm";
export default function NewRecipePage() {
  return <PageTransition kind="detail"><div className="page">
    <Link className="link-plain inline-block mb-12" href="/ideas/recipes">→ ספר המתכונים</Link>
    <h1 className="page-title">מתכון חדש</h1>
    <p className="page-subtitle">שם מספיק כדי להתחיל. אפשר להוסיף קישור, מתכון והערה משותפת.</p>
    <div className="card"><RecipeForm /></div>
  </div></PageTransition>;
}
