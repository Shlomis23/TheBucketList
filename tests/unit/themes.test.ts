import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { colorThemes, parseTheme, themedCoverPath } from "@/lib/themes";
import { categoryCoverImages } from "@/lib/covers";

describe("ערכות צבע", () => {
  it("ערך לא מוכר -> סגול", () => {
    expect(parseTheme(undefined)).toBe("purple");
    expect(parseTheme("pink")).toBe("purple");
    expect(parseTheme("mango")).toBe("mango");
  });
  it("לכל ערכה ולכל קטגוריה יש איור", () => {
    for (const theme of colorThemes) {
      for (const path of Object.values(categoryCoverImages)) {
        const file = `public${themedCoverPath(theme, `${path.split("/").pop()}.svg`)}`;
        expect(existsSync(file), file).toBe(true);
      }
    }
  });
});
