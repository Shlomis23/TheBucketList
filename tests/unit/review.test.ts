import { describe, expect, it } from "vitest";
import { orderForReview, pendingPreview, swipeDecision, tallyAnswers } from "@/lib/validation/review";

const idea = (id: string, createdAt: string, partnerAnswered = false) => ({ id, createdAt, partnerAnswered });

describe("סבב החלטות — סדר", () => {
  it("קודם מה שבן/בת הזוג כבר ענו (שם יכול לצאת מאצ'), ובתוך כל קבוצה החדש קודם", () => {
    const out = orderForReview([
      idea("old", "2026-09-01"),
      idea("new", "2026-09-20"),
      idea("answered-old", "2026-09-02", true),
      idea("answered-new", "2026-09-10", true),
    ]);
    expect(out.map((i) => i.id)).toEqual(["answered-new", "answered-old", "new", "old"]);
  });
  it("הרעיון מההתראה ראשון", () => {
    const out = orderForReview([idea("a", "2026-09-20", true), idea("b", "2026-09-01")], "b");
    expect(out.map((i) => i.id)).toEqual(["b", "a"]);
  });
  it("first שכבר לא ברשימה (כבר ענית) — מתעלמים", () => {
    expect(orderForReview([idea("a", "2026-09-20")], "zzz").map((i) => i.id)).toEqual(["a"]);
  });
});

describe("סבב החלטות — עזרים", () => {
  it("סיכום התשובות", () => expect(tallyAnswers(["yes", "no", "yes", "maybe"])).toEqual({ yes: 2, maybe: 1, no: 1 }));
  it("תצוגה מקדימה בבאנר", () => {
    expect(pendingPreview(["קיאקים"])).toBe("קיאקים");
    expect(pendingPreview(["קיאקים", "בוקר"])).toBe("קיאקים, בוקר");
    expect(pendingPreview(["קיאקים", "בוקר", "סדנה", "טיול"])).toBe("קיאקים, ועוד 3");
    expect(pendingPreview([])).toBe("");
    expect(pendingPreview(["קיאקים", "בוקר", "סדנה"], 6)).toBe("קיאקים, ועוד 5"); // בבית: 3 שמות מתוך 6
  });
  it("החלקה: ימינה כן, שמאלה לא, קצר מדי — כלום", () => {
    expect(swipeDecision(120)).toBe("yes");
    expect(swipeDecision(-95)).toBe("no");
    expect(swipeDecision(40)).toBeNull();
  });
});
