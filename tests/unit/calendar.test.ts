import { describe, expect, it } from "vitest";
import { buildIcs, eventEnd, foldLine, googleCalendarUrl, icsDate, icsEscape } from "@/lib/calendar";

const ev = {
  uid: "plan-1@the-bucket-list",
  title: "הופעה של נסרין, ואגם; בוחבוט",
  startsAt: "2026-10-13T18:00:00.000Z",
  endsAt: null,
  location: "היכל מנורה, תל אביב",
  notes: "לקחת אטמי אוזניים\\nוכרטיסים",
  url: "https://example.test/plans/1",
};

describe("יומן — ics", () => {
  it("תאריך UTC בפורמט של יומן", () => expect(icsDate("2026-10-13T18:05:09.123Z")).toBe("20261013T180509Z"));
  it("בלי שעת סיום — שעתיים", () => expect(eventEnd(ev)).toBe("2026-10-13T20:00:00.000Z"));
  it("בורחים מתווים מיוחדים", () => expect(icsEscape("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne"));
  it("קיפול שורה לפי בתים, בלי לחתוך אות עברית", () => {
    const folded = foldLine("SUMMARY:" + "א".repeat(80));
    const enc = new TextEncoder();
    for (const part of folded.split("\r\n")) expect(enc.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split("\r\n").map((p, i) => (i ? p.slice(1) : p)).join("")).toBe("SUMMARY:" + "א".repeat(80));
  });
  it("קובץ שלם: אירוע, תזכורת שעתיים לפני, מקום, קישור", () => {
    const ics = buildIcs(ev, new Date("2026-09-26T10:00:00Z"));
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("DTSTART:20261013T180000Z");
    expect(unfolded).toContain("DTEND:20261013T200000Z");
    expect(unfolded).toContain("SUMMARY:הופעה של נסרין\\, ואגם\\; בוחבוט");
    expect(unfolded).toContain("LOCATION:היכל מנורה\\, תל אביב");
    expect(unfolded).toContain("TRIGGER:-PT2H");
    expect(unfolded).toContain("URL:https://example.test/plans/1");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("יומן — גוגל", () => {
  it("קישור עם כותרת, זמנים ומקום", () => {
    const u = new URL(googleCalendarUrl({ ...ev, endsAt: "2026-10-13T21:30:00.000Z" }));
    expect(u.hostname).toBe("calendar.google.com");
    expect(u.searchParams.get("action")).toBe("TEMPLATE");
    expect(u.searchParams.get("text")).toBe(ev.title);
    expect(u.searchParams.get("dates")).toBe("20261013T180000Z/20261013T213000Z");
    expect(u.searchParams.get("location")).toBe(ev.location);
    expect(u.searchParams.get("details")).toContain(ev.url);
  });
});
