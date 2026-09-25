import { describe, expect, it } from "vitest";
import { formatPlanWhen, isPlanPast, pastWhenLabel } from "@/lib/validation/plan";

// שישי 25.9.2026, 18:00 בישראל
const now = new Date("2026-09-25T15:00:00Z");
const h = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();

describe("המועד עבר (איך היה?)", () => {
  it("בלי שעת סיום — רק 3 שעות אחרי ההתחלה", () => {
    expect(isPlanPast(h(-1), null, now.getTime())).toBe(false);
    expect(isPlanPast(h(-4), null, now.getTime())).toBe(true);
  });
  it("עם שעת סיום — אחרי הסיום", () => {
    expect(isPlanPast(h(-5), h(1), now.getTime())).toBe(false);
    expect(isPlanPast(h(-5), h(-1), now.getTime())).toBe(true);
  });
  it("בלי מועד — אף פעם לא עבר", () => {
    expect(isPlanPast(null, null, now.getTime())).toBe(false);
  });
});

describe("\"היה אתמול\"", () => {
  it.each([
    [-4, "היום"],
    [-24, "אתמול"],
    [-72, "ביום שלישי"],
    [-240, "לפני 10 ימים"],
  ])("%i שעות -> %s", (hours, label) => {
    expect(pastWhenLabel(h(hours), now)).toBe(label);
  });
});

describe("formatPlanWhen", () => {
  it("בלי מועד", () => expect(formatPlanWhen(null)).toBe("מועד לא נקבע עדיין"));
  it("שעון ישראל", () => expect(formatPlanWhen("2026-10-03T16:30:00Z")).toContain("19:30"));
});
