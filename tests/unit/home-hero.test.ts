import { describe, expect, it } from "vitest";
import { daysUntilLabel, pickHeroKind, planTodayKicker } from "@/lib/validation/home";

const now = new Date("2026-09-26T09:00:00Z"); // שבת 26.9, 12:00 בישראל
const base = { upcomingPlan: null, pastPlansCount: 0, partnerNewIdeasCount: 0, unreadCount: 0 };

describe("pickHeroKind — סדר העדיפויות", () => {
  it("אין כלום", () => expect(pickHeroKind(base, now)).toBe("idle"));
  it("תוכנית היום גוברת על הכול", () =>
    expect(pickHeroKind({ upcomingPlan: { startsAt: "2026-09-26T18:00:00Z" }, pastPlansCount: 2, partnerNewIdeasCount: 3, unreadCount: 1 }, now)).toBe("plan_today"));
  it("איך היה > רעיון חדש > הודעה > תוכנית קרובה", () => {
    const soon = { startsAt: "2026-09-29T18:00:00Z" };
    expect(pickHeroKind({ upcomingPlan: soon, pastPlansCount: 1, partnerNewIdeasCount: 1, unreadCount: 1 }, now)).toBe("how_was");
    expect(pickHeroKind({ upcomingPlan: soon, pastPlansCount: 0, partnerNewIdeasCount: 1, unreadCount: 1 }, now)).toBe("partner_idea");
    expect(pickHeroKind({ upcomingPlan: soon, pastPlansCount: 0, partnerNewIdeasCount: 0, unreadCount: 1 }, now)).toBe("unread");
    expect(pickHeroKind({ ...base, upcomingPlan: soon }, now)).toBe("upcoming");
  });
  it("תוכנית בלי מועד = קרובה, לא היום", () => expect(pickHeroKind({ ...base, upcomingPlan: { startsAt: null } }, now)).toBe("upcoming"));
  it("היום לפי שעון ישראל (23:30 בישראל = 20:30 UTC)", () =>
    expect(pickHeroKind({ ...base, upcomingPlan: { startsAt: "2026-09-26T20:30:00Z" } }, now)).toBe("plan_today"));
});

describe("תגיות", () => {
  it("הערב / היום / עכשיו", () => {
    expect(planTodayKicker("2026-09-26T18:00:00Z", now)).toBe("הערב"); // 21:00
    expect(planTodayKicker("2026-09-26T11:00:00Z", now)).toBe("היום"); // 14:00
    expect(planTodayKicker("2026-09-26T08:30:00Z", now)).toBe("עכשיו");
  });
  it("מחר / מחרתיים / בעוד N ימים / שבוע", () => {
    expect(daysUntilLabel("2026-09-27T18:00:00Z", now)).toBe("מחר");
    expect(daysUntilLabel("2026-09-28T18:00:00Z", now)).toBe("מחרתיים");
    expect(daysUntilLabel("2026-09-30T18:00:00Z", now)).toBe("בעוד 4 ימים");
    expect(daysUntilLabel("2026-10-03T18:00:00Z", now)).toBe("בעוד שבוע");
    expect(daysUntilLabel(null, now)).toBe("התוכנית הקרובה");
  });
});
