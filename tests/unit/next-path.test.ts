import { describe, expect, it } from "vitest";
import { nextPathKind, safeNextPath } from "@/lib/validation/nextPath";

const id = "00000000-0000-4000-8000-000000000201";

describe("יעד חזרה אחרי כניסה", () => {
  it("רק דף תוכנית/רעיון/זיכרון", () => {
    expect(safeNextPath(`/plans/${id}`)).toBe(`/plans/${id}`);
    expect(safeNextPath(`/memories/${id}`)).toBe(`/memories/${id}`);
    expect(safeNextPath("//evil.example/plans/x")).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath(`/plans/${id}?x=1`)).toBeNull();
    expect(safeNextPath("/settings")).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
  it("סוג הדף לנוסח", () => {
    expect(nextPathKind(`/ideas/${id}`)).toBe("idea");
    expect(nextPathKind(`/plans/${id}`)).toBe("plan");
  });
});
