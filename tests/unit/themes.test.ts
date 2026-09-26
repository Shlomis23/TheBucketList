import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { colorThemes, parseTheme } from "@/lib/themes";
import { getIdeaCoverImage } from "@/lib/covers";
import { ideaCategories } from "@/lib/validation/idea";

describe("ערכות צבע", () => {
  it("ערך לא מוכר -> סגול", () => {
    expect(parseTheme(undefined)).toBe("purple");
    expect(parseTheme("pink")).toBe("purple");
    expect(parseTheme("mango")).toBe("mango");
  });
  it("לכל ערכה ולכל קטגוריה יש איור, בכתובת נפרדת לכל ערכה", () => {
    for (const theme of colorThemes) {
      for (const c of ideaCategories) {
        const path = getIdeaCoverImage(c, theme);
        expect(existsSync(`public${path}`), path).toBe(true);
      }
    }
    expect(getIdeaCoverImage("food", "mango")).not.toBe(getIdeaCoverImage("food", "purple"));
  });
});
