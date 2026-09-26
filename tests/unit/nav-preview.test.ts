import { afterEach, describe, expect, it, vi } from "vitest";
import { getPreview, getRecentPreview, previewAttr, rememberPreview } from "@/lib/nav/preview";

const kayak = { title: "קיאקים בכנרת", category: "outdoors" as const, costMinor: null, durationMinutes: 240 };

afterEach(() => vi.useRealTimers());

describe("previewAttr", () => {
  it("שם, קטגוריה ומחיר/משך — בלי שדות ריקים", () => {
    const raw = previewAttr(kayak)["data-preview"];
    expect(JSON.parse(raw)).toEqual({ title: "קיאקים בכנרת", category: "outdoors", subtitle: "4 שעות" });
  });
  it("מאצ' וארכיון מסומנים", () => {
    const raw = previewAttr({ ...kayak, isMatch: true, status: "archived" })["data-preview"];
    expect(JSON.parse(raw)).toMatchObject({ isMatch: true, archived: true });
  });
});

describe("rememberPreview / getPreview", () => {
  it("לפי כתובת", () => {
    rememberPreview("/ideas/a", previewAttr(kayak)["data-preview"]);
    expect(getPreview("/ideas/a")?.title).toBe("קיאקים בכנרת");
    expect(getPreview("/ideas/zzz")).toBeNull();
  });
  it("הכתובת עוד לא התעדכנה — הרעיון שנלחץ הרגע, ורק ב-4 השניות הראשונות", () => {
    vi.useFakeTimers();
    rememberPreview("/ideas/b", previewAttr({ ...kayak, title: "ב" })["data-preview"]);
    expect(getPreview("/ideas")?.title).toBe("ב");
    expect(getRecentPreview()?.title).toBe("ב");
    vi.advanceTimersByTime(4100);
    expect(getPreview("/ideas")).toBeNull();
    expect(getRecentPreview()).toBeNull();
  });
  it("לחיצה על קישור בלי תצוגה מבטלת את האחרון", () => {
    rememberPreview("/ideas/c", previewAttr(kayak)["data-preview"]);
    rememberPreview("/plans", null);
    expect(getRecentPreview()).toBeNull();
    expect(getPreview("/")).toBeNull();
  });
  it("מאפיין פגום או קטגוריה לא מוכרת — מתעלמים", () => {
    rememberPreview("/ideas/d", "{not json");
    rememberPreview("/ideas/e", JSON.stringify({ title: "x", category: "nope" }));
    expect(getPreview("/ideas/d")).toBeNull();
    expect(getPreview("/ideas/e")).toBeNull();
  });
});
