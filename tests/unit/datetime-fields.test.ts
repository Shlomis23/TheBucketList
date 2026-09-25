import { describe, expect, it } from "vitest";
import { endPartsToIso, isoToParts, partsToIso } from "@/components/DateTimeRangeFields";

describe("שדות תאריך + שעה", () => {
  it("ריק = אין מועד (תקין)", () => expect(partsToIso({ date: "", time: "" })).toEqual({}));
  it("רק אחד מהם = שגיאה ברורה", () => {
    expect(partsToIso({ date: "2026-10-01", time: "" }).error).toBe("חסרה שעה");
    expect(partsToIso({ date: "", time: "19:00" }).error).toBe("חסר תאריך");
  });
  it("הלוך ושוב בלי לאבד דקות", () => {
    const { iso } = partsToIso({ date: "2026-10-01", time: "19:05" });
    expect(isoToParts(iso!)).toEqual({ date: "2026-10-01", time: "19:05" });
  });
  it("'עד' שמולא אוטומטית בלי שעה = אין שעת סיום (לא שגיאה)", () => {
    const start = { date: "2026-10-01", time: "19:00" };
    expect(endPartsToIso(start, { date: "2026-10-01", time: "" })).toEqual({});
    expect(endPartsToIso(start, { date: "2026-10-02", time: "" }).error).toBe("חסרה שעה");
  });
});
