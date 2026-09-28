import { describe, expect, it } from "vitest";
import { recipeSchema, recipeMatches, deleteRecipeSchema } from "@/lib/validation/recipe";
const base = { id: "c17effd8-eecf-4d2e-b75e-df730a980e21", expectedVersion: null, title: "סלט" };
describe("recipes", () => {
  it("allows a name alone and trims input", () => {
    expect(recipeSchema.parse({ ...base, title: " סלט " })).toMatchObject({ title: "סלט", sourceUrl: "", body: "", note: "" });
  });
  it.each(["javascript:alert(1)", "http://example.com", "https://", "https://user:pass@example.com", "data:text/html,hello"])("rejects unsafe or invalid link %s", sourceUrl => {
    expect(recipeSchema.safeParse({ ...base, sourceUrl }).success).toBe(false);
  });
  it("allows a secure source link", () => expect(recipeSchema.safeParse({ ...base, sourceUrl: "https://example.com/recipe" }).success).toBe(true));
  it("requires a title and limits sizes", () => {
    for (const values of [{title:" "},{title:"x".repeat(121)},{body:"x".repeat(20001)},{note:"x".repeat(3001)},{expectedVersion:0}]) {
      expect(recipeSchema.safeParse({...base,...values}).success).toBe(false);
    }
    expect(deleteRecipeSchema.safeParse({id:base.id,expectedVersion:null}).success).toBe(false);
  });
  it("searches title, body and note as literal case-insensitive substrings", () => {
    const r={title:"סלט כרוב",body:"טחינה ולימון",note:"Try 100% tahini"};
    for(const q of ["כרוב","טחינה","TRY","100%"," "])expect(recipeMatches(r,q)).toBe(true);
    expect(recipeMatches(r,"סלט לימון")).toBe(false);
    expect(recipeMatches(r,"חומוס")).toBe(false);
  });
});
