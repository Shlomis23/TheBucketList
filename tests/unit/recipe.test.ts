import { describe, expect, it } from "vitest";
import { recipeSchema, recipeMatchesFilters, recipeMatches, deleteRecipeSchema } from "@/lib/validation/recipe";
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

describe("recipe classifications", () => {
  it("keeps older input unclassified and allows either field independently", () => {
    expect(recipeSchema.parse(base)).toMatchObject({course:null,classification:null});
    expect(recipeSchema.parse({...base,course:"side"})).toMatchObject({course:"side",classification:null});
    expect(recipeSchema.parse({...base,classification:"dairy"})).toMatchObject({course:null,classification:"dairy"});
    expect(recipeSchema.parse({...base,course:null,classification:null})).toMatchObject({course:null,classification:null});
  });
  it("rejects unknown values and multiple selections", () => {
    for (const fields of [{course:"invalid"},{classification:"vegan"},{course:["salad","side"]},{classification:""}]) {
      expect(recipeSchema.safeParse({...base,...fields}).success).toBe(false);
    }
  });
  it("combines text search and both filters", () => {
    const recipe={title:"סלט",body:"מלפפון וגבינה",note:"להוסיף לימון",course:"salad" as const,classification:"dairy" as const};
    expect(recipeMatchesFilters(recipe,"לימון","salad","dairy")).toBe(true);
    for (const args of [["לימון","side","dairy"],["לימון","salad","meat"],["טחינה","salad","dairy"],["","unclassified",""]]) {
      expect(recipeMatchesFilters(recipe,args[0],args[1],args[2])).toBe(false);
    }
    expect(recipeMatchesFilters(recipe,"","","")).toBe(true);
  });
  it("keeps unclassified recipes visible and supports finding missing classifications", () => {
    const recipe={title:"סלט",body:"",note:"",course:null,classification:null};
    expect(recipeMatchesFilters(recipe,"","","")).toBe(true);
    expect(recipeMatchesFilters(recipe,"","unclassified","unclassified")).toBe(true);
    expect(recipeMatchesFilters(recipe,"","salad","")).toBe(false);
    expect(recipeMatchesFilters({...recipe,course:"side"},"","side","unclassified")).toBe(true);
  });
});
