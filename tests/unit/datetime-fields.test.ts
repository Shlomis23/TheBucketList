import { describe, expect, it } from "vitest";
import { buildPlanTimes, endPartsToIso, isoToParts, partsToIso, planToParts } from "@/components/DateTimeRangeFields";

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

describe("מועד תוכנית: תאריך חובה, שעה וסיום אופציונליים", () => {
  it("בלי תאריך התחלה = שגיאה", () => {
    expect(buildPlanTimes({ date: "", time: "" }, { date: "", time: "" }).startError).toBe("חובה לבחור תאריך");
    expect(buildPlanTimes({ date: "", time: "19:00" }, { date: "", time: "" }).startError).toBe("חובה לבחור תאריך");
  });
  it("תאריך בלבד = כל היום, הסיום הוא יום ההתחלה", () => {
    const r = buildPlanTimes({ date: "2026-10-13", time: "" }, { date: "", time: "" });
    expect(r.startsAt).toBe("2026-10-12T21:00:00.000Z"); // חצות ישראל (UTC+3 עד 25.10)
    expect(r.endsAt).toBe("2026-10-13T21:00:00.000Z");
  });
  it("תאריך סיום מאוחר = כמה ימים", () => {
    const r = buildPlanTimes({ date: "2026-10-13", time: "" }, { date: "2026-10-15", time: "" });
    expect(r.endsAt).toBe("2026-10-15T21:00:00.000Z");
  });
  it("סיום לפני ההתחלה = שגיאה", () => {
    expect(buildPlanTimes({ date: "2026-10-13", time: "" }, { date: "2026-10-12", time: "" }).endError).toBeTruthy();
  });
  it("עם שעה ובלי סיום = בלי ends_at", () => {
    const r = buildPlanTimes({ date: "2026-10-13", time: "19:00" }, { date: "2026-10-13", time: "" });
    expect(r.startsAt).toBeTruthy();
    expect(r.endsAt).toBeUndefined();
  });
  it("הלוך ושוב של תוכנית בלי שעה", () => {
    const r = buildPlanTimes({ date: "2026-10-13", time: "" }, { date: "2026-10-15", time: "" });
    expect(planToParts(r.startsAt!, r.endsAt!)).toEqual({
      start: { date: "2026-10-13", time: "" },
      end: { date: "2026-10-15", time: "" },
    });
  });
});
