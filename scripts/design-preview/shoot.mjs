// מצלם את מסכי האפליקציה מול ה-Supabase המזויף, בהיר + כהה, לתיקייה.
// node scripts/design-preview/shoot.mjs <out-dir> [base-url]
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { ME } from "./fixtures.mjs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = await import(process.env.PLAYWRIGHT_PATH ?? "playwright"); }
const { chromium } = playwright;

const out = process.argv[2] ?? "design-shots";
const base = process.argv[3] ?? "http://localhost:3200";
mkdirSync(out, { recursive: true });

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const SCREENS = [
  ["home", "/"],
  ["ideas", "/ideas"],
  ["ideas-waiting", "/ideas?view=waiting"],
  ["ideas-archive", "/ideas?status=archived"],
  ["idea-match", `/ideas/${id(1)}`],
  ["idea-waiting-me", `/ideas/${id(2)}`],
  ["idea-new", "/ideas/new"],
  ["idea-edit", `/ideas/${id(3)}/edit`],
  ["choose", "/choose"],
  ["plans", "/plans"],
  ["plan-upcoming", `/plans/${id(201)}`],
  ["plan-past", `/plans/${id(202)}`],
  ["plan-new", `/plans/new?ideaId=${id(1)}`],
  ["memories", "/memories"],
  ["memory-photos", `/memories/${id(301)}`],
  ["memory-empty", `/memories/${id(302)}`],
  ["memory-edit", `/memories/${id(301)}/edit`],
  ["settings", "/settings"],
  ["settings-close", "/settings/close"],
  ["account-delete", "/account/delete"],
  ["not-found", "/nope-not-here"],
];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: ME, role: "authenticated", aud: "authenticated", exp: 4102444800 })}.sig`;
const session = { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: 4102444800, refresh_token: "fake", user: { id: ME } };

const browser = await chromium.launch();
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce", serviceWorkers: "block" });
  await ctx.addCookies([{ name: "sb-localhost-auth-token", value: `base64-${b64(session)}`, url: base }]);
  const page = await ctx.newPage();
  for (const [name, path] of SCREENS) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${name}-${scheme}.png`, fullPage: true });
  }
  await ctx.close();
}
// מסך כניסה — בלי session
const anon = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await anon.newPage();
await p.goto(base + "/login", { waitUntil: "networkidle" });
await p.screenshot({ path: `${out}/login-light.png`, fullPage: true });
await browser.close();
console.log(`shots -> ${out}`);
