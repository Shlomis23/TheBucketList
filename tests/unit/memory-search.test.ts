import { describe, expect, it } from "vitest";
import { memoryMatches, normalizeSearchText, type SearchableMemory } from "@/lib/validation/memory";

const m: SearchableMemory = {
  title: "ארוחה בחומוס אליהו",
  story: "הכי טעים שאכלנו, ישבנו עד מאוחר.",
  place: "עכו",
  happenedOn: "2026-08-14",
  categoryLabel: "אוכל",
};

describe("normalizeSearchText", () => {
  it("ניקוד, אותיות סופיות, פיסוק", () => expect(normalizeSearchText("שָׁלוֹם, עוֹלָם!")).toBe("שלומ עולמ"));
  it("גרשיים", () => expect(normalizeSearchText('צה"ל')).toBe("צהל"));
});

describe("memoryMatches", () => {
  it("חיפוש ריק מוצא הכול", () => expect(memoryMatches(m, "  ")).toBe(true));
  it("כותרת", () => expect(memoryMatches(m, "חומוס")).toBe(true));
  it("חלק ממילה", () => expect(memoryMatches(m, "חומ")).toBe(true));
  it("סיפור", () => expect(memoryMatches(m, "טעים")).toBe(true));
  it("מקום", () => expect(memoryMatches(m, "עכו")).toBe(true));
  it("קטגוריה", () => expect(memoryMatches(m, "אוכל")).toBe(true));
  it("חודש ושנה", () => {
    expect(memoryMatches(m, "אוגוסט")).toBe(true);
    expect(memoryMatches(m, "2026")).toBe(true);
  });
  it("כל המילים צריכות להופיע", () => {
    expect(memoryMatches(m, "חומוס עכו")).toBe(true);
    expect(memoryMatches(m, "חומוס חיפה")).toBe(false);
  });
  it("אות סופית באמצע הקלדה", () => expect(memoryMatches(m, "אליהו מאוחר")).toBe(true));
  it("לא נמצא", () => expect(memoryMatches(m, "סושי")).toBe(false));
});
