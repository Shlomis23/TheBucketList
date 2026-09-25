import { describe, expect, it } from "vitest";
import { formatPlanWhen, isPlanPast, pastWhenLabel, upcomingWhenLabel } from "@/lib/validation/plan";

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
