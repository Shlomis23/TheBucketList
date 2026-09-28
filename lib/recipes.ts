export const recipeCourses = ["main", "side", "salad", "soup", "bread_pastry", "dessert", "sauce_spread", "other"] as const;
export const recipeClassifications = ["meat", "dairy", "pareve"] as const;
export type RecipeCourse = typeof recipeCourses[number];
export type RecipeClassification = typeof recipeClassifications[number];
export const courseLabels: Record<RecipeCourse, string> = { main: "עיקרית", side: "תוספת", salad: "סלט", soup: "מרק", bread_pastry: "לחם ומאפה", dessert: "קינוח", sauce_spread: "רוטב וממרח", other: "אחר" };
export const classificationLabels: Record<RecipeClassification, string> = { meat: "בשרי", dairy: "חלבי", pareve: "פרווה" };
export function recipeClassificationText(recipe: { course?: RecipeCourse | null; classification?: RecipeClassification | null }) {
  return [recipe.course && courseLabels[recipe.course], recipe.classification && classificationLabels[recipe.classification]].filter(Boolean).join(" · ");
}
