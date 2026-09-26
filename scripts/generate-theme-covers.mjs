// מייצר את איורי הקטגוריות לכל ערכת צבע (26.9): public/images/covers/<theme>/*.svg.
// המקור — הגרסה הסגולה ב-public/images/covers/*.svg; כאן רק מחליפים את גווני
// הסגול בגוונים של הערכה. להריץ אחרי שינוי באיור או בערכה:
//   node scripts/generate-theme-covers.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";

const SOURCE = "public/images/covers";
// סגול (מקור) -> גוון בערכה. deep/brand/mid/light/darkest/tint/soft.
const THEMES = {
  ocean: { "#241b3a": "#142236", "#46307d": "#1f4a85", "#5b3e9e": "#2a5fa8", "#3a2870": "#1a3c6c", "#8a6fd6": "#7fa8e0", "#2c2350": "#16283f", "#f3edff": "#eaf2ff", "#efe9fb": "#e5eefb" },
  turquoise: { "#241b3a": "#0e2a2c", "#46307d": "#075a5e", "#5b3e9e": "#0a7479", "#3a2870": "#064a4e", "#8a6fd6": "#6fd6d8", "#2c2350": "#06292b", "#f3edff": "#e0fafa", "#efe9fb": "#dcf3f4" },
  mango: { "#241b3a": "#3a2208", "#46307d": "#a04500", "#5b3e9e": "#b24d00", "#3a2870": "#7a3500", "#8a6fd6": "#ffb866", "#2c2350": "#3d1d02", "#f3edff": "#fff1e0", "#efe9fb": "#fdeedd" },
};

const files = readdirSync(SOURCE).filter((f) => f.endsWith(".svg") && f !== "hero-login.svg");
for (const [theme, map] of Object.entries(THEMES)) {
  mkdirSync(`${SOURCE}/${theme}`, { recursive: true });
  for (const f of files) {
    let svg = readFileSync(`${SOURCE}/${f}`, "utf8");
    for (const [from, to] of Object.entries(map)) svg = svg.replace(new RegExp(from, "gi"), to);
    writeFileSync(`${SOURCE}/${theme}/${f}`, svg);
  }
}
console.log(`${files.length} covers x ${Object.keys(THEMES).length} themes`);
