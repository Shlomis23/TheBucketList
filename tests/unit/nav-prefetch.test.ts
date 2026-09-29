import { describe, expect, it } from "vitest";
import { nextTabToPrefetch } from "@/lib/nav/prefetch";

describe("nextTabToPrefetch", () => {
  it("prefetches only the next likely bottom tab", () => {
    expect(nextTabToPrefetch("/")).toBe("/ideas");
    expect(nextTabToPrefetch("/ideas/123")).toBe("/plans");
    expect(nextTabToPrefetch("/plans/123")).toBe("/memories");
    expect(nextTabToPrefetch("/memories")).toBe("/");
    expect(nextTabToPrefetch("/settings")).toBe("/");
  });
});
