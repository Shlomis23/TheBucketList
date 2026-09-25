// יוצר את מסכי הפתיחה לאייפון ב-public/splash (ראו lib/pwa/splash.ts).
// הרצה: node scripts/generate-splash.mjs
// רקע = --color-bg של האפליקציה (כמו מסך הפתיחה של אנדרואיד מה-manifest),
// האייקון במרכז, קצת מעל האמצע.
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";

const SCREENS = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2],
];
const BG = "#faf8ff";
const icon = readFileSync(new URL("../public/icons/icon.svg", import.meta.url));
mkdirSync(new URL("../public/splash/", import.meta.url), { recursive: true });

for (const [w, h, dpr] of SCREENS) {
  const W = w * dpr;
  const H = h * dpr;
  const size = Math.round(112 * dpr); // 112 נקודות — כמו אייקון גדול
  const iconPng = await sharp(icon, { density: 300 }).resize(size, size).png().toBuffer();
  const shadow = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}">
      <defs><filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${14 * dpr}"/></filter></defs>
      <rect x="${size / 2}" y="${size / 2 + 10 * dpr}" width="${size}" height="${size}" rx="${size * 0.225}" fill="#46287f" opacity="0.28" filter="url(#f)"/>
    </svg>`,
  );
  const top = Math.round(H * 0.44 - size / 2);
  const left = Math.round((W - size) / 2);
  await sharp({ create: { width: W, height: H, channels: 3, background: BG } })
    .composite([
      { input: shadow, top: top - size / 2, left: left - size / 2 },
      { input: iconPng, top, left },
    ])
    .png({ compressionLevel: 9, palette: true })
    .toFile(new URL(`../public/splash/splash-${W}x${H}.png`, import.meta.url).pathname);
  console.log(`splash-${W}x${H}.png`);
}
