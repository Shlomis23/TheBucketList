import { describe, expect, it } from "vitest";
import { buildPayload, type PushContext } from "@/lib/push-payload";

const ctx = (over: Partial<PushContext> = {}): PushContext => ({
  spaceStatus: "open",
  actorName: "נועה",
  ideaTitle: "טיול לגולן",
  planTitle: "פיקניק בטבע",
  planStartsAt: "2026-10-03T16:30:00Z",
  targets: [],
  ...over,
});

describe("ניסוחי התראות", () => {
  it("רעיון חדש", () => {
    expect(buildPayload({ kind: "idea_created", ideaId: "i1" }, ctx())).toMatchObject({
      title: "רעיון חדש מנועה",
      body: "טיול לגולן",
      url: "/ideas/i1",
    });
  });
  it("מאצ' — בלי אימוג'י", () => {
    const p = buildPayload({ kind: "match", ideaId: "i1" }, ctx())!;
    expect(p.title).toBe("יש מאצ'!");
    expect(p.body).toBe("שניכם רוצים: טיול לגולן");
    expect(/\p{Extended_Pictographic}/u.test(p.title + p.body)).toBe(false);
  });
  it("הודעה — קיצור הודעה ארוכה", () => {
    const p = buildPayload({ kind: "comment_added", ideaId: "i1", body: "א".repeat(300) }, ctx())!;
    expect(p.body.length).toBeLessThanOrEqual(120);
  });
  it("תוכנית חדשה/עדכון — עם המועד, בלי \"מחכה לאישור\"", () => {
    const created = buildPayload({ kind: "plan_created", planId: "p1" }, ctx())!;
    expect(created.title).toBe("תוכנית חדשה מנועה");
    expect(created.body).toContain("פיקניק בטבע");
    expect(created.body).toContain("19:30");
    expect(created.body).not.toContain("אישור");
    expect(buildPayload({ kind: "plan_updated", planId: "p1" }, ctx())!.title).toBe("עדכון בתוכנית מנועה");
  });
  it("תוכנית בוטלה", () => {
    expect(buildPayload({ kind: "plan_cancelled", planId: "p1" }, ctx())).toMatchObject({
      title: "תוכנית בוטלה",
      body: "פיקניק בטבע · בוטלה ע״י נועה",
    });
  });
  it("תמונות — יחיד/רבים", () => {
    expect(buildPayload({ kind: "photos_added", memoryId: "m1", count: 1 }, ctx())!.title).toBe("תמונה חדשה מנועה");
    expect(buildPayload({ kind: "photos_added", memoryId: "m1", count: 3 }, ctx())!.title).toBe("3 תמונות חדשות מנועה");
  });
  it("בלי שם תצוגה — \"מבן/בת הזוג\"", () => {
    expect(buildPayload({ kind: "idea_created", ideaId: "i1" }, ctx({ actorName: null }))!.title).toBe("רעיון חדש מבן/בת הזוג");
  });
  it("פריט שלא שייך למרחב (כותרת חסרה) — לא שולחים כלום", () => {
    expect(buildPayload({ kind: "idea_created", ideaId: "x" }, ctx({ ideaTitle: null }))).toBeNull();
  });
  it("סגירת מרחב", () => {
    expect(buildPayload({ kind: "space_closed" }, ctx())).toMatchObject({ title: "המרחב נסגר ע״י נועה", url: "/space-closed" });
  });
});
