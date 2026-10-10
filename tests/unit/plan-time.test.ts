import { describe, expect, it } from "vitest";
import { formatPlanWhen, isPlanPast, pastWhenLabel, planHasTime, shiftPlanWeek, upcomingWhenLabel } from "@/lib/validation/plan";

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

describe("upcomingWhenLabel", () => {
  const now = new Date("2026-09-25T09:00:00Z"); // שישי 25.9, 12:00 בישראל
  it("היום", () => expect(upcomingWhenLabel("2026-09-25T16:00:00Z", now)).toBe("היום, 19:00"));
  it("מחר", () => expect(upcomingWhenLabel("2026-09-26T16:00:00Z", now)).toBe("מחר, 19:00"));
  it("היום לפי שעון ישראל, גם כש-UTC עוד ביום הקודם", () =>
    expect(upcomingWhenLabel("2026-09-26T16:00:00Z", new Date("2026-09-25T22:30:00Z"))).toBe("היום, 19:00"));
  it("רחוק יותר — עם תאריך", () => {
    const label = upcomingWhenLabel("2026-10-13T16:00:00Z", now);
    expect(label).toContain("שלישי");
    expect(label).toContain("13");
    expect(label).toContain("19:00");
  });
  it("בלי מועד", () => expect(upcomingWhenLabel(null, now)).toBe("מועד לא נקבע עדיין"));
});

describe("תוכנית בלי שעה (חצות ישראל)", () => {
  const day = "2026-10-12T21:00:00.000Z"; // 13.10, 00:00 בישראל
  it("planHasTime", () => {
    expect(planHasTime(day)).toBe(false);
    expect(planHasTime("2026-10-13T16:00:00Z")).toBe(true);
  });
  it("מוצג בלי שעה", () => {
    expect(formatPlanWhen(day)).not.toMatch(/\d:\d/);
    expect(upcomingWhenLabel(day, new Date("2026-10-13T06:00:00Z"))).toBe("היום");
  });
  it("עובר רק אחרי שהיום נגמר", () => {
    expect(isPlanPast(day, null, Date.parse("2026-10-13T12:00:00Z"))).toBe(false);
    expect(isPlanPast(day, null, Date.parse("2026-10-13T22:00:00Z"))).toBe(true);
  });
  it("דחייה בשבוע שומרת על חצות", () => {
    expect(shiftPlanWeek(day)).toBe("2026-10-19T21:00:00.000Z");
    // מעל מעבר שעון קיץ (25.10): חצות ישראל זז מ-21:00Z ל-22:00Z
    expect(shiftPlanWeek("2026-10-21T21:00:00.000Z")).toBe("2026-10-28T22:00:00.000Z");
  });
});
