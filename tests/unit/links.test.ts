import { describe, expect, it } from "vitest";
import { extractHttpsLinks, linkHost, shortLinkLabel, splitTrailingPunctuation, tokenizeLinks } from "@/lib/validation/comment";

describe("זיהוי קישורים בשיחה", () => {
  it.each([
    ["https://mako.co.il", "https://mako.co.il"],
    ["Https://mako.co.il", "https://mako.co.il"], // אות ראשונה גדולה מהמקלדת באייפון (25.9)
    ["http://example.com/a", "https://example.com/a"], // http משודרג
    ["www.ynet.co.il", "https://www.ynet.co.il"],
    ["eventim.co.il/event/123", "https://eventim.co.il/event/123"],
  ])("%s -> %s", (input, href) => {
    expect(extractHttpsLinks(`ראו ${input} מחר`)).toEqual([href]);
  });

  it("לא מזהה כתובת מייל כקישור", () => {
    expect(extractHttpsLinks("כתבו ל-shlomi@mako.co.il")).toEqual([]);
  });

  it("מפריד סימן פיסוק שנדבק לסוף", () => {
    expect(splitTrailingPunctuation("mako.co.il.")).toEqual({ url: "mako.co.il", trailing: "." });
    const tokens = tokenizeLinks("(ראו https://x.com/a).");
    expect(tokens.find((t) => t.type === "link")).toMatchObject({ href: "https://x.com/a" });
  });

  it("אף פעם לא יוצר href שאינו https", () => {
    for (const t of tokenizeLinks("javascript:alert(1) data:text/html,x ftp://a.com")) {
      if (t.type === "link") expect(t.href.startsWith("https://")).toBe(true);
    }
  });

  it("תוויות קצרות", () => {
    expect(shortLinkLabel("https://www.example.com/")).toBe("www.example.com");
    expect(shortLinkLabel("https://example.com/" + "a".repeat(80), 20).length).toBeLessThanOrEqual(20);
    expect(linkHost("https://www.eventim.co.il/event/1")).toContain("eventim.co.il");
  });
});
