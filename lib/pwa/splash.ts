// מסכי פתיחה לאייפון (26.9). iOS לא בונה מסך פתיחה מה-manifest כמו אנדרואיד —
// בלי תמונה מתאימה בדיוק לגודל המסך, פתיחה מהבית מתחילה בהבזק לבן.
// כל שורה: נקודות מסך (CSS px), יחס פיקסלים, ושם הקובץ ב-public/splash.
// התמונות נוצרות ע"י scripts/generate-splash.mjs (אותה רשימה).
export const SPLASH_SCREENS = [
  { w: 440, h: 956, dpr: 3 }, // iPhone 16/17/18 Pro Max
  { w: 420, h: 912, dpr: 3 }, // iPhone Air
  { w: 402, h: 874, dpr: 3 }, // iPhone 16 Pro, 17, 17/18 Pro
  { w: 430, h: 932, dpr: 3 }, // 14/15 Pro Max, 15/16 Plus
  { w: 393, h: 852, dpr: 3 }, // 14/15 Pro, 15, 16
  { w: 428, h: 926, dpr: 3 }, // 12/13 Pro Max, 14 Plus
  { w: 390, h: 844, dpr: 3 }, // 12, 13, 14, 12/13 Pro, 16e
  { w: 375, h: 812, dpr: 3 }, // X, XS, 11 Pro, 12/13 mini
  { w: 414, h: 896, dpr: 3 }, // XS Max, 11 Pro Max
  { w: 414, h: 896, dpr: 2 }, // XR, 11
  { w: 414, h: 736, dpr: 3 }, // 6/7/8 Plus
  { w: 375, h: 667, dpr: 2 }, // SE 2/3, 6/7/8
] as const;

export function splashFileName(s: { w: number; h: number; dpr: number }) {
  return `splash-${s.w * s.dpr}x${s.h * s.dpr}.png`;
}

export const splashStartupImages = SPLASH_SCREENS.map((s) => ({
  url: `/splash/${splashFileName(s)}`,
  media: `(device-width: ${s.w}px) and (device-height: ${s.h}px) and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: portrait)`,
}));
