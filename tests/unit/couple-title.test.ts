import { describe, expect, it } from "vitest";
import { coupleTitle } from "@/lib/validation/home";

describe("coupleTitle — שורת השמות בבית", () => {
  it("קודם אני, אחר כך בן/בת הזוג", () => {
    expect(coupleTitle("שלומי", "גואל")).toBe("שלומי וגואל");
    expect(coupleTitle("גואל", "שלומי")).toBe("גואל ושלומי");
  });
  it("בלי בן/בת זוג — רק אני", () => {
    expect(coupleTitle("שלומי", null)).toBe("שלומי");
    expect(coupleTitle("שלומי", "  ")).toBe("שלומי");
  });
  it("שם לועזי — ו עם מקף", () => {
    expect(coupleTitle("שלומי", "Dan")).toBe("שלומי ו-Dan");
  });
  it("רווחים מסביב נחתכים", () => {
    expect(coupleTitle(" שלומי ", " גואל ")).toBe("שלומי וגואל");
  });
});
