// איורי הקטגוריות (27.9, כיוון ג' מההדמיה): סצנה עשירה לכל אחת מ-7 הקטגוריות,
// בכל 4 ערכות הצבע. מייצר public/images/covers/*.svg (סגול) ו-
// public/images/covers/<theme>/*.svg. להריץ אחרי שינוי באיור או בערכה:
//   node scripts/generate-covers.mjs
//
// האיור מוצג בהרבה חיתוכים (object-fit: cover): ריבוע ברשימה, 2:1 בראש דף
// רעיון, רצועה של ~4:1 בכרטיס תוכנית, 3:4 בכרטיס הסבב. לכן viewBox ריבועי,
// והעיקר של כל סצנה מרוכז ברצועה האמצעית (y≈140–260, x≈60–340).
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "public/images/covers";
const THEMES = {
  purple: { night: "#2e1f5c", deep: "#46307d", mid: "#4b3290", bright: "#6a49b3", glow: "#8a5ad0", tint: "#f3edff", ink: "#241b3a" },
  ocean: { night: "#16283f", deep: "#1f4a85", mid: "#22508f", bright: "#3b78c9", glow: "#5b93dd", tint: "#eaf2ff", ink: "#142236" },
  turquoise: { night: "#06292b", deep: "#075a5e", mid: "#0a6a6e", bright: "#0fa3a8", glow: "#3cc3c7", tint: "#e0fafa", ink: "#0e2a2c" },
  mango: { night: "#3d1d02", deep: "#7a3500", mid: "#a04500", bright: "#f08a1c", glow: "#ffa94d", tint: "#fff1e0", ink: "#3a2208" },
};
// קבועים בכל הערכות — צבעי "העולם" (שמש, עץ, מים, צמחייה, וילון).
const C = { sun: "#ffd27a", cream: "#ffe7c2", pink: "#d6426f", wood: "#5a3a26", woodTop: "#7a5238", leaf: "#2f6b4f", leafDark: "#1f4d39", water: "#5fb0e0", waterDeep: "#3f8fc4", curtain: "#b8324f", curtainDark: "#8e2540" };

const defs = (P) => `
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.night}"/><stop offset="0.75" stop-color="${P.bright}"/><stop offset="1" stop-color="${P.glow}"/></linearGradient>
  <linearGradient id="skyDeep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.night}"/><stop offset="1" stop-color="${P.mid}"/></linearGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity="0.6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="warm"><stop offset="0" stop-color="${C.sun}" stop-opacity="0.7"/><stop offset="1" stop-color="${C.sun}" stop-opacity="0"/></radialGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;

const stars = (list, color = "#fff") => list.map(([x, y, r, o = 0.8]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${o}"/>`).join("");

const SCENES = {
  // שולחן ערב: צלחת במרכז, נר משמאל, כוס יין מימין, אדים מעל.
  food: (P) => `
  <rect width="400" height="400" fill="url(#sky)"/>
  <circle cx="200" cy="190" r="170" fill="url(#warm)" opacity="0.55"/>
  ${stars([[60, 60, 2], [340, 50, 2], [300, 100, 1.5], [90, 110, 1.5]])}
  <g stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.5">
    <path d="M178 196c-10-14 10-20 0-36"/><path d="M200 190c-10-14 10-20 0-36"/><path d="M222 196c-10-14 10-20 0-36"/>
  </g>
  <path d="M0 250H400V400H0Z" fill="${C.wood}"/><path d="M0 250H400v12H0Z" fill="${C.woodTop}"/>
  <ellipse cx="200" cy="262" rx="104" ry="22" fill="#000" opacity="0.22"/>
  <ellipse cx="200" cy="248" rx="100" ry="28" fill="#fff"/><ellipse cx="200" cy="245" rx="70" ry="18" fill="${P.tint}"/>
  <path d="M158 238q42-32 84 0q-42 13-84 0Z" fill="#f0a24a"/><path d="M176 232q24-14 48 0" stroke="#d9822e" stroke-width="4" fill="none"/>
  <circle cx="182" cy="231" r="6" fill="#5fb85c"/><circle cx="214" cy="229" r="6" fill="#e2463a"/><circle cx="200" cy="236" r="4" fill="#5fb85c"/>
  <g transform="translate(318 0)"><path d="M-14 170h28l-3 42c-1 9-8 14-11 14s-10-5-11-14Z" fill="#fff" opacity="0.85"/><path d="M-12 186h24l-2 24c-1 7-6 10-10 10s-9-3-10-10Z" fill="${C.curtain}"/><path d="M0 226v22M-12 250h24" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.85"/></g>
  <circle cx="86" cy="196" r="46" fill="url(#warm)"/>
  <rect x="78" y="204" width="16" height="48" rx="4" fill="${C.cream}"/><path d="M86 202q9-12 0-24q-9 12 0 24Z" fill="${C.sun}"/><path d="M86 198q4-6 0-12q-4 6 0 12Z" fill="#fff"/>`,

  // הרים עם שלג, שמש, רכסים ויער.
  outdoors: (P) => `
  <rect width="400" height="400" fill="url(#sky)"/>
  <circle cx="296" cy="128" r="120" fill="url(#glow)" opacity="0.55"/><circle cx="296" cy="128" r="40" fill="${C.sun}"/>
  ${stars([[60, 50, 1.8], [140, 36, 1.4], [220, 60, 1.6]])}
  <path d="M0 250 116 136 196 214 280 146 400 256V400H0Z" fill="${P.night}"/>
  <path d="M116 136 196 214 168 218 116 164Z" fill="#000" opacity="0.2"/><path d="M280 146 400 256 360 256 280 176Z" fill="#000" opacity="0.2"/>
  <path d="M116 136 140 162 128 158 118 170 104 156 92 160Z" fill="#fff"/><path d="M280 146 302 172 290 168 280 180 268 166 256 170Z" fill="#fff"/>
  <path d="M0 262q100-34 200-8t200-16V400H0Z" fill="${P.mid}"/>
  <path d="M0 296q120-26 240-6t160-6V400H0Z" fill="${C.leaf}"/>
  <g fill="${C.leafDark}"><path d="M36 300l20-60 20 60Z"/><path d="M70 306l15-46 15 46Z"/><path d="M318 300l20-62 20 62Z"/><path d="M350 306l14-44 14 44Z"/></g>
  <path d="M150 330q50-10 100 0q-50 8-100 0Z" fill="${C.water}" opacity="0.7"/>`,

  // במה: וילונות, אלומת אור, כוכב, שורת קהל.
  culture: (P) => `
  <rect width="400" height="400" fill="url(#skyDeep)"/>
  <path d="M200 40 96 300H304Z" fill="url(#beam)"/>
  <path d="M0 0h400v58q-100 26-200 0t-200 0Z" fill="${C.curtain}"/>
  <path d="M0 0h86v400H0Z" fill="${C.curtainDark}"/><path d="M314 0h86v400h-86Z" fill="${C.curtainDark}"/>
  <g stroke="#6e1a31" stroke-width="5" opacity="0.55"><path d="M22 60v340M52 60v340M348 60v340M378 60v340"/></g>
  <path d="M86 60q20 120 0 240" stroke="${C.sun}" stroke-width="4" fill="none" opacity="0.4"/><path d="M314 60q-20 120 0 240" stroke="${C.sun}" stroke-width="4" fill="none" opacity="0.4"/>
  <path d="M86 280H314v40H86Z" fill="${P.night}"/><ellipse cx="200" cy="282" rx="96" ry="12" fill="#fff" opacity="0.28"/>
  <path d="M200 162l10 26h28l-22 16 8 27-24-16-24 16 8-27-22-16h28Z" fill="${C.sun}"/>
  ${stars([[146, 206, 3], [258, 184, 3], [236, 246, 2.4], [168, 250, 2]])}
  <g fill="#000" opacity="0.45"><circle cx="110" cy="360" r="22"/><circle cx="160" cy="366" r="22"/><circle cx="210" cy="360" r="22"/><circle cx="260" cy="366" r="22"/><circle cx="305" cy="360" r="22"/><path d="M80 372h250v40H80Z"/></g>`,

  // טיסה בשקיעה: שמש, מטוס, עננים וים.
  trip: (P) => `
  <rect width="400" height="400" fill="url(#sky)"/>
  <circle cx="120" cy="160" r="120" fill="url(#warm)" opacity="0.8"/><circle cx="120" cy="160" r="46" fill="${C.sun}"/>
  <path d="M0 290q100-20 200 0t200 0V400H0Z" fill="${C.water}"/><path d="M0 318q100-16 200 0t200 0V400H0Z" fill="${C.waterDeep}"/>
  <path d="M90 296q30 4 60 0" stroke="#fff" stroke-width="3" opacity="0.5"/><path d="M250 324q30 4 60 0" stroke="#fff" stroke-width="3" opacity="0.5"/>
  <g fill="#fff"><ellipse cx="310" cy="258" rx="80" ry="20" opacity="0.9"/><ellipse cx="276" cy="246" rx="42" ry="22" opacity="0.9"/><ellipse cx="70" cy="262" rx="70" ry="16" opacity="0.75"/><ellipse cx="100" cy="252" rx="34" ry="16" opacity="0.75"/></g>
  <path d="M40 230q70 18 150-18" stroke="#fff" stroke-width="3" stroke-dasharray="8 10" fill="none" opacity="0.6"/>
  <g transform="translate(250 190) rotate(-14) scale(0.72)">
    <path d="M-120 0q0-14 20-14h170q40 0 50 14q-10 14-50 14h-170q-20 0-20-14Z" fill="#fff"/>
    <path d="M-10-12 30-80h26l-12 68Z" fill="#fff"/><path d="M-10 12 30 80h26l-12-68Z" fill="${P.tint}"/><path d="M-110-12-120-50h16l20 38Z" fill="#fff"/>
    <g fill="${P.bright}"><circle cx="60" cy="-2" r="5"/><circle cx="40" cy="-2" r="5"/><circle cx="20" cy="-2" r="5"/><circle cx="0" cy="-2" r="5"/></g>
  </g>`,

  // ערב בבית: חלון מואר, ירח, מנורה, עציץ וספה.
  home: (P) => `
  <rect width="400" height="400" fill="url(#skyDeep)"/>
  ${stars([[40, 40, 1.8], [100, 70, 1.4], [350, 40, 1.8], [370, 110, 1.4]])}
  <circle cx="330" cy="80" r="24" fill="${C.cream}"/><circle cx="340" cy="74" r="22" fill="${P.night}" opacity="0.55"/>
  <rect x="60" y="100" width="280" height="300" rx="8" fill="${P.night}"/>
  <circle cx="200" cy="190" r="150" fill="url(#warm)" opacity="0.55"/>
  <rect x="112" y="124" width="176" height="136" rx="8" fill="#f6c96a"/><path d="M200 124v136M112 192h176" stroke="${C.woodTop}" stroke-width="8"/>
  <rect x="104" y="258" width="192" height="12" rx="4" fill="${C.woodTop}"/>
  <g transform="translate(130 258)"><path d="M-12 0h24l-4-18h-16Z" fill="${C.curtain}"/><path d="M0-18q-18-22-4-40M0-18q14-20 2-38M0-18q-2-24 20-30" stroke="#5fb85c" stroke-width="6" fill="none" stroke-linecap="round"/></g>
  <g transform="translate(262 258)"><path d="M0 0v-46" stroke="${C.cream}" stroke-width="4"/><path d="M-16-46h32l-6-22h-20Z" fill="${C.cream}"/><circle cx="0" cy="-40" r="30" fill="url(#warm)"/></g>
  <path d="M80 330q0-26 26-26h188q26 0 26 26v40H80Z" fill="${P.mid}"/><rect x="92" y="316" width="96" height="30" rx="12" fill="${P.bright}" opacity="0.8"/><rect x="212" y="316" width="96" height="30" rx="12" fill="${P.bright}" opacity="0.8"/>`,

  // ספר פתוח ונורה דולקת.
  learning: (P) => `
  <rect width="400" height="400" fill="url(#sky)"/>
  <circle cx="200" cy="150" r="140" fill="url(#warm)" opacity="0.7"/>
  ${stars([[70, 80, 2], [330, 70, 2], [120, 170, 1.6], [290, 190, 1.6]])}
  <g stroke="${C.sun}" stroke-width="6" stroke-linecap="round" opacity="0.8"><path d="M200 70v-18M140 96l-12-12M260 96l12-12M118 150h-18M282 150h18"/></g>
  <path d="M200 100a46 46 0 0 1 28 82v14h-56v-14a46 46 0 0 1 28-82Z" fill="${C.sun}"/><path d="M190 180q10-30 20 0" stroke="#d9a23a" stroke-width="4" fill="none"/>
  <rect x="176" y="198" width="48" height="10" rx="4" fill="#fff"/><rect x="182" y="210" width="36" height="9" rx="4" fill="#fff"/>
  <path d="M56 236q72-24 144 6q72-30 144-6v96q-72-24-144 6q-72-30-144-6Z" fill="#000" opacity="0.18" transform="translate(0 8)"/>
  <path d="M56 236q72-24 144 6q72-30 144-6v96q-72-24-144 6q-72-30-144-6Z" fill="#fff"/><path d="M200 242v96" stroke="#cfc8dd" stroke-width="4"/>
  <g stroke="#cfc8dd" stroke-width="4" stroke-linecap="round"><path d="M84 262q46-12 92 4M84 282q46-12 92 4M84 302q46-12 92 4M224 266q50-14 92-4M224 286q50-14 92-4M224 306q50-14 92-4"/></g>`,

  // הפתעה: כוכב זוהר וקונפטי.
  other: (P) => `
  <rect width="400" height="400" fill="url(#sky)"/>
  <circle cx="200" cy="200" r="160" fill="url(#glow)" opacity="0.45"/>
  <path d="M200 116 218 182 284 200 218 218 200 284 182 218 116 200 182 182Z" fill="${C.sun}"/>
  <path d="M200 150 208 192 250 200 208 208 200 250 192 208 150 200 192 192Z" fill="#fff" opacity="0.6"/>
  <g fill="#fff" opacity="0.85"><path d="M96 120 102 140 122 146 102 152 96 172 90 152 70 146 90 140Z"/><path d="M308 250 313 266 329 271 313 276 308 292 303 276 287 271 303 266Z"/></g>
  <g fill="${C.pink}"><rect x="112" y="258" width="12" height="6" rx="2" transform="rotate(30 118 261)"/><circle cx="300" cy="130" r="6"/><rect x="250" y="310" width="12" height="6" rx="2" transform="rotate(-20 256 313)"/></g>
  <g fill="#7fd1a1"><circle cx="330" cy="200" r="5"/><rect x="66" y="210" width="12" height="6" rx="2" transform="rotate(50 72 213)"/></g>
  <g fill="${C.cream}"><circle cx="150" cy="320" r="4"/><circle cx="270" cy="90" r="4"/><circle cx="60" cy="300" r="3"/></g>`,
};

const LABEL = { food: "אוכל", outdoors: "טבע וחוץ", culture: "תרבות", trip: "טיול", home: "בית", learning: "למידה", other: "אחר" };

let count = 0;
for (const [theme, P] of Object.entries(THEMES)) {
  const dir = theme === "purple" ? OUT : `${OUT}/${theme}`;
  mkdirSync(dir, { recursive: true });
  for (const [cat, scene] of Object.entries(SCENES)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${LABEL[cat]}">
<defs>${defs(P)}</defs>${scene(P)}
</svg>
`;
    writeFileSync(`${dir}/${cat}.svg`, svg.replace(/\n\s+/g, "\n"));
    count++;
  }
}
console.log(`${count} covers (7 categories x ${Object.keys(THEMES).length} themes)`);
