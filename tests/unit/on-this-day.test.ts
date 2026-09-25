import { describe, expect, it } from "vitest";
import { pickOnThisDay } from "@/lib/validation/memory";

const m = (id: string, happenedOn: string, hasPhoto = true) => ({ id, happenedOn, hasPhoto });

describe("pickOnThisDay", () => {
  it("אין זיכרונות משנים קודמות", () => {
    expect(pickOnThisDay([m("a", "2026-09-26")], "2026-09-26")).toBeNull();
  });
  it("בדיוק לפני שנה", () => {
    expect(pickOnThisDay([m("a", "2025-09-26")], "2026-09-26")).toEqual({ id: "a", yearsAgo: 1, exact: true, label: "לפני שנה בדיוק" });
  });
  it("לפני שנתיים / 3 שנים", () => {
    expect(pickOnThisDay([m("a", "2024-09-26")], "2026-09-26")?.label).toBe("לפני שנתיים בדיוק");
    expect(pickOnThisDay([m("a", "2023-09-26")], "2026-09-26")?.label).toBe("לפני 3 שנים בדיוק");
  });
  it("השבוע (עד 3 ימים)", () => {
    expect(pickOnThisDay([m("a", "2025-09-24")], "2026-09-26")?.label).toBe("השבוע לפני שנה");
    expect(pickOnThisDay([m("a", "2025-09-29")], "2026-09-26")?.label).toBe("השבוע לפני שנה");
    expect(pickOnThisDay([m("a", "2025-09-30")], "2026-09-26")).toBeNull();
  });
  it("מעבר שנה: 30.12 מול 2.1", () => {
    expect(pickOnThisDay([m("a", "2025-12-30")], "2027-01-02")?.label).toBe("השבוע לפני שנה");
  });
  it("בדיוק גובר על השבוע, והקרוב בזמן על הרחוק", () => {
    const r = pickOnThisDay([m("week", "2025-09-25"), m("exact2", "2024-09-26"), m("exact1", "2025-09-26")], "2026-09-26");
    expect(r?.id).toBe("exact1");
  });
  it("עם תמונות גובר כשהכול שווה", () => {
    expect(pickOnThisDay([m("no", "2025-09-26", false), m("yes", "2025-09-26", true)], "2026-09-26")?.id).toBe("yes");
  });
  it("29.2 נחגג ב-28.2 בשנה לא מעוברת", () => {
    expect(pickOnThisDay([m("a", "2024-02-29")], "2025-02-28")).toMatchObject({ exact: true, yearsAgo: 1 });
  });
});

describe("pickPerSpace (התראת לפני שנה)", () => {
  it("זיכרון אחד למרחב: הכי קרוב בזמן, ועם תמונות כשזה שווה", async () => {
    const { pickPerSpace } = await import("@/lib/reminders");
    const row = (space_id: string, memory_id: string, years_ago: number, has_photo: boolean) => ({
      space_id, memory_id, title: memory_id, years_ago, has_photo, targets: [],
    });
    const out = pickPerSpace([row("s1", "old", 2, true), row("s1", "noPhoto", 1, false), row("s1", "best", 1, true), row("s2", "other", 3, false)]);
    expect(out.map((r) => r.memory_id).sort()).toEqual(["best", "other"]);
  });
});
