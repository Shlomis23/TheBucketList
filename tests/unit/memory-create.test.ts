import { describe, expect, it } from "vitest";
import { createMemorySchema, updateMemorySchema } from "@/lib/validation/memory";

const base = { requestId: "3f2b8c1e-8d7a-4c1e-9a52-1f0b6a7d9e11", title: "ערב ספונטני", happenedOn: "2026-10-09" };

describe("זיכרון בלי תוכנית", () => {
  it("שם ותאריך מספיקים; סיפור וקטגוריה אופציונליים", () => {
    const r = createMemorySchema.parse(base);
    expect(r.story).toBe("");
    expect(r.category).toBeUndefined();
  });
  it("שם חובה", () => {
    expect(createMemorySchema.safeParse({ ...base, title: "   " }).success).toBe(false);
  });
  it("קטגוריה לא מוכרת נדחית, null מותר", () => {
    expect(createMemorySchema.safeParse({ ...base, category: "nope" }).success).toBe(false);
    expect(createMemorySchema.safeParse({ ...base, category: null }).success).toBe(true);
  });
  it("עריכה דורשת גם שם", () => {
    const edit = { memoryId: base.requestId, expectedVersion: 1, happenedOn: base.happenedOn };
    expect(updateMemorySchema.safeParse(edit).success).toBe(false);
    expect(updateMemorySchema.safeParse({ ...edit, title: "שם" }).success).toBe(true);
  });
});
