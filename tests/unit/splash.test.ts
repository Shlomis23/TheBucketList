import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPLASH_SCREENS, splashFileName, splashStartupImages } from "@/lib/pwa/splash";

describe("iPhone splash screens", () => {
  it("לכל גודל מסך יש קובץ ב-public/splash", () => {
    for (const s of SPLASH_SCREENS) expect(existsSync(`public/splash/${splashFileName(s)}`), splashFileName(s)).toBe(true);
  });
  it("media query לפי גודל ויחס פיקסלים", () => {
    expect(splashStartupImages[0].media).toBe(
      "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    );
  });
});
