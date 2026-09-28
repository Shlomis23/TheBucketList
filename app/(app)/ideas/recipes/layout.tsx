import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMySpaceId } from "@/lib/dal/space";
export default async function RecipesLayout({ children }: { children: React.ReactNode }) {
  if (!await getVerifiedUserId()) redirect("/login");
  if (!await getMySpaceId()) redirect("/onboarding");
  return children;
}
