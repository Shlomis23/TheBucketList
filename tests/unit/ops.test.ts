import { describe, expect, it } from "vitest";
import { healthProblem } from "@/lib/ops";

const now = new Date("2026-09-27T06:07:00Z");
const ok = { errors: [] as string[], purgeFailed: 0 };

describe("healthProblem", () => {
  it("הכול תקין — בלי התראה", () => expect(healthProblem(ok, "2026-09-26T06:07:00Z", now)).toBeNull());
  it("ריצה ראשונה (אין קודמת)", () => expect(healthProblem(ok, null, now)).toBeNull());
  it("שגיאה", () => expect(healthProblem({ errors: ["plan notifications failed"], purgeFailed: 0 }, "2026-09-26T06:07:00Z", now)).toContain("plan notifications failed"));
  it("מחיקה נכשלה", () => expect(healthProblem({ errors: [], purgeFailed: 1 }, "2026-09-26T06:07:00Z", now)).toContain("מחיקת מרחב"));
  it("דילגנו על יום (יותר מ-36 שעות)", () => expect(healthProblem(ok, "2026-09-24T06:07:00Z", now)).toContain("לפני 3 ימים"));
});
