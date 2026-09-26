import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPreview,
  getRecentPreview,
  ideaPreviewAttr,
  memoryPreviewAttr,
  planPreviewAttr,
  rememberPreview,
} from "@/lib/nav/preview";

const kayak = { title: "קיאקים בכנרת", category: "outdoors" as const, costMinor: null, durationMinutes: 240 };
const raw = (a: { "data-preview": string }) => a["data-preview"];
const planRaw = raw(
  planPreviewAttr({ title: "ערב קריוקי", ideaCategory: "culture", startsAt: "2026-10-10T16:30:00Z", meetingPlace: "תל אביב" }),
);
const memoryRaw = raw(
  memoryPreviewAttr({ title: "שקיעה", category: null, coverPhotoId: "p1", planId: "pl1" }, "יום שבת, 12 בספטמבר 2026"),
);

afterEach(() => vi.useRealTimers());

describe("מאפייני הקישור", () => {
  it("רעיון: שם, קטגוריה ומחיר/משך — בלי שדות ריקים", () => {
    expect(JSON.parse(raw(ideaPreviewAttr(kayak)))).toEqual({
      kind: "idea",
      title: "קיאקים בכנרת",
      category: "outdoors",
      subtitle: "4 שעות",
    });
  });
  it("רעיון: מאצ' וארכיון מסומנים", () => {
    expect(JSON.parse(raw(ideaPreviewAttr({ ...kayak, isMatch: true, status: "archived" })))).toMatchObject({
      isMatch: true,
      archived: true,
    });
  });
  it("תוכנית: בלי סטטוס (כרטיסי הבית) = מוצעת; המועד נשמר גולמי", () => {
    expect(JSON.parse(planRaw)).toEqual({
      kind: "plan",
      title: "ערב קריוקי",
      category: "culture",
      status: "proposed",
      startsAt: "2026-10-10T16:30:00Z",
      meetingPlace: "תל אביב",
    });
  });
  it("זיכרון: תאריך מעוצב, שער ותוכנית", () => {
    expect(JSON.parse(memoryRaw)).toMatchObject({ kind: "memory", dateLabel: "יום שבת, 12 בספטמבר 2026", coverPhotoId: "p1", planId: "pl1" });
  });
});

describe("rememberPreview / getPreview", () => {
  it("לפי כתובת וסוג", () => {
    rememberPreview("/ideas/a", raw(ideaPreviewAttr(kayak)));
    rememberPreview("/plans/b", planRaw);
    rememberPreview("/memories/c", memoryRaw);
    expect(getPreview("/ideas/a", "idea")?.title).toBe("קיאקים בכנרת");
    expect(getPreview("/plans/b", "plan")?.startsAt).toBe("2026-10-10T16:30:00Z");
    expect(getPreview("/memories/c", "memory")?.planId).toBe("pl1");
    expect(getPreview("/ideas/a", "plan")).toBeNull(); // סוג אחר
    expect(getPreview("/ideas/zzz", "idea")).toBeNull(); // דף פרטים אחר
  });
  it("קישור שלא מתאים לסוג — לא נשמר", () => {
    rememberPreview("/ideas/x", planRaw);
    expect(getPreview("/ideas/x", "plan")).toBeNull();
    expect(getRecentPreview()).toBeNull();
  });
  it("הכתובת עוד לא התעדכנה — הפריט שנלחץ הרגע, מאותו סוג, רק ב-4 השניות הראשונות", () => {
    vi.useFakeTimers();
    rememberPreview("/plans/d", planRaw);
    expect(getPreview("/", "plan")?.title).toBe("ערב קריוקי");
    expect(getPreview("/plans", "plan")?.title).toBe("ערב קריוקי");
    expect(getPreview("/", "idea")).toBeNull();
    expect(getRecentPreview()?.kind).toBe("plan");
    vi.advanceTimersByTime(4100);
    expect(getPreview("/", "plan")).toBeNull();
    expect(getRecentPreview()).toBeNull();
  });
  it("לחיצה על קישור בלי תצוגה מבטלת את האחרון", () => {
    rememberPreview("/ideas/e", raw(ideaPreviewAttr(kayak)));
    rememberPreview("/plans", null);
    expect(getRecentPreview()).toBeNull();
    expect(getPreview("/", "idea")).toBeNull();
  });
  it("מאפיין פגום, קטגוריה או סטטוס לא מוכרים — מתעלמים", () => {
    rememberPreview("/ideas/f", "{not json");
    rememberPreview("/ideas/g", JSON.stringify({ kind: "idea", title: "x", category: "nope" }));
    rememberPreview("/plans/h", JSON.stringify({ ...JSON.parse(planRaw), status: "weird" }));
    expect(getPreview("/ideas/f", "idea")).toBeNull();
    expect(getPreview("/ideas/g", "idea")).toBeNull();
    expect(getPreview("/plans/h", "plan")).toBeNull();
  });
});
