import { describe, expect, it } from "vitest";
import { CLOSE_CONFIRM_WORD, GRACE_DAYS, daysLeft } from "@/lib/validation/account";

describe("סגירת מרחב", () => {
  it("14 יום חרטה, אישור בהקלדת \"סגירה\"", () => {
    expect(GRACE_DAYS).toBe(14);
    expect(CLOSE_CONFIRM_WORD).toBe("סגירה");
  });
  it("ימים שנשארו — מעוגל למעלה, לא שלילי", () => {
    expect(daysLeft(new Date(Date.now() + 13.2 * 86_400_000).toISOString())).toBe(14);
    expect(daysLeft(new Date(Date.now() - 86_400_000).toISOString())).toBe(0);
  });
});
