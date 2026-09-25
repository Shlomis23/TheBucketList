import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processPhoto, sniffImageType } from "@/lib/photos/process";

describe("עיבוד תמונות בשרת", () => {
  it("מזהה סוג לפי תוכן הקובץ, לא לפי שם/הצהרה", async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).png().toBuffer();
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
  });

  it("מסובב לפי EXIF, מסיר מטא-דאטה (GPS), מקטין, ויוצר ממוזערת", async () => {
    const input = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#48a" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const r = await processPhoto(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const full = await sharp(r.photo.full).metadata();
    const thumb = await sharp(r.photo.thumb).metadata();
    expect([full.width, full.height]).toEqual([1200, 1600]); // עומד, עד 1600
    expect(full.exif).toBeUndefined();
    expect(Math.min(thumb.width!, thumb.height!)).toBe(480);
  }, 20_000);

  it("חוסם קבצים מזויפים, קטועים ו\"פצצות פיקסלים\"", async () => {
    expect(await processPhoto(Buffer.from("not an image at all"))).toEqual({ ok: false, error: "UNSUPPORTED" });
    const jpg = await sharp({ create: { width: 800, height: 800, channels: 3, background: "#000" } }).jpeg().toBuffer();
    expect((await processPhoto(jpg.subarray(0, 300))).ok).toBe(false);
    const bomb = await sharp({ create: { width: 10000, height: 10000, channels: 3, background: "#fff" } }).png().toBuffer();
    expect(await processPhoto(bomb)).toEqual({ ok: false, error: "INVALID" });
  }, 30_000);
});
