import { describe, expect, it } from "vitest";
import { ideaStatusTag, parseIdeaListParams } from "@/lib/validation/ideaList";

const base = { myReaction: null, partnerReaction: null, isMatch: false, hasPlan: false, planStartsAt: null } as const;
const p = { present: true, name: "גואל" };

describe("ideaStatusTag", () => {
  it("שניכם עוד לא עניתם — מחכה לך (הכפתורים ירדו מהשורה)", () => expect(ideaStatusTag(base, p)?.label).toBe("מחכה לך"));
  it("מחכה לך / מחכה לגואל", () => {
    expect(ideaStatusTag({ ...base, partnerReaction: "yes" }, p)?.label).toBe("מחכה לך");
    expect(ideaStatusTag({ ...base, myReaction: "yes" }, p)?.label).toBe("מחכה לגואל");
  });
  it("שניכם ענו בלי מאצ'", () => expect(ideaStatusTag({ ...base, myReaction: "yes", partnerReaction: "maybe" }, p)?.label).toBe("גואל: אולי"));
  it("מאצ' ובתוכנית (בתוכנית גובר)", () => {
    expect(ideaStatusTag({ ...base, myReaction: "yes", partnerReaction: "yes", isMatch: true }, p)?.kind).toBe("match");
    const t = ideaStatusTag({ ...base, isMatch: true, hasPlan: true, planStartsAt: "2026-10-13T18:00:00Z" }, p);
    expect(t?.kind).toBe("plan");
    expect(t?.label).toContain("13");
    expect(ideaStatusTag({ ...base, hasPlan: true }, p)?.label).toBe("בתוכנית");
  });
  it("בלי בן/בת זוג במרחב — אין 'מחכה ל...'", () => {
    expect(ideaStatusTag({ ...base, myReaction: "yes" }, { present: false, name: null })).toBeNull();
  });
  it("בלי שם — ניסוח ניטרלי", () => expect(ideaStatusTag({ ...base, myReaction: "no" }, { present: true, name: null })?.label).toBe("מחכה לבן/בת הזוג"));
});

describe("view=waiting", () => {
  it("נקרא מה-URL, ומתעלמים ממנו בארכיון", () => {
    expect(parseIdeaListParams({ view: "waiting" }).view).toBe("waiting");
    expect(parseIdeaListParams({ view: "waiting", status: "archived" }).view).toBe("all");
  });
});
