import { describe, expect, it } from "vitest";
import { createIdeaSchema, durationOptionsFor, formatCostMinor, formatDurationMinutes } from "@/lib/validation/idea";

const base = { requestId: "11111111-1111-4111-8111-111111111111", title: "טיול לגולן" };

describe("רעיון חדש", () => {
  it("כותרת חובה, עד 120 תווים", () => {
    expect(createIdeaSchema.safeParse({ ...base, title: "  " }).success).toBe(false);
    expect(createIdeaSchema.safeParse({ ...base, title: "א".repeat(121) }).success).toBe(false);
  });
  it("קישור חייב https", () => {
    expect(createIdeaSchema.safeParse({ ...base, sourceUrl: "http://x.com" }).success).toBe(false);
    expect(createIdeaSchema.safeParse({ ...base, sourceUrl: "https://x.com" }).success).toBe(true);
  });
  it("place_id — רק תווים של Google", () => {
    expect(createIdeaSchema.safeParse({ ...base, placeId: "ChIJ_abc-123" }).success).toBe(true);
    expect(createIdeaSchema.safeParse({ ...base, placeId: "bad id!" }).success).toBe(false);
  });
  it("\"גם אני רוצה\" — false אם לא נשלח (הטופס שולח true כברירת מחדל)", () => {
    expect(createIdeaSchema.parse(base).selfYes).toBe(false);
    expect(createIdeaSchema.parse({ ...base, selfYes: true }).selfYes).toBe(true);
  });
});

describe("תצוגת עלות ומשך", () => {
  it("עלות", () => {
    expect(formatCostMinor(null)).toBeNull();
    expect(formatCostMinor(0)).toContain("חינם");
  });
  it("יומיים (לא סופ\"ש)", () => {
    expect(formatDurationMinutes(2880)).toBe("יומיים");
  });
  it("ערך קיים שאינו ברשימה נשאר בחירה", () => {
    expect(durationOptionsFor(95).some((o) => o.minutes === 95)).toBe(true);
  });
});
