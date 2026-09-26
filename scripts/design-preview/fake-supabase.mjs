// Supabase מזויף (מקומי) לצילומי "לפני/אחרי" של שכבת העיצוב (26.9).
// מממש רק את מה שהאפליקציה קוראת: PostgREST (select/eq/neq/in/is/order/limit,
// count), RPC-ים של קריאה, /auth/v1/user ו-Storage להורדת תמונות.
// הנתונים קבועים (fixtures.mjs), כך ששתי ריצות באותו יום נותנות פיקסלים זהים.
// לא נוגע במסד האמיתי. הרצה: ראו scripts/design-preview/README.md.
import http from "node:http";
import { buildFixtures, ME, SERVICE_KEY } from "./fixtures.mjs";

const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 54321);
const db = await buildFixtures();

function parseFilters(params) {
  const filters = [];
  for (const [key, raw] of params) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    const m = raw.match(/^(not\.)?(eq|neq|in|is|gt|gte|lt|lte)\.(.*)$/s);
    if (!m) continue;
    let [, not, op, value] = m;
    if (op === "in") value = value.replace(/^\(|\)$/g, "").split(",").map((v) => v.replace(/^"|"$/g, ""));
    filters.push({ key, op, value, not: Boolean(not) });
  }
  return filters;
}

function matches(row, f) {
  const v = row[f.key];
  let ok;
  switch (f.op) {
    case "eq": ok = String(v) === f.value; break;
    case "neq": ok = String(v) !== f.value; break;
    case "in": ok = f.value.includes(String(v)); break;
    case "is": ok = f.value === "null" ? v === null || v === undefined : String(v) === f.value; break;
    case "gt": ok = v > f.value; break;
    case "gte": ok = v >= f.value; break;
    case "lt": ok = v < f.value; break;
    case "lte": ok = v <= f.value; break;
    default: ok = true;
  }
  return f.not ? !ok : ok;
}

function applyOrder(rows, order) {
  if (!order) return rows;
  const keys = order.split(",").map((part) => {
    const [col, ...mods] = part.split(".");
    return { col, desc: mods.includes("desc"), nullsFirst: mods.includes("nullsfirst") };
  });
  return [...rows].sort((a, b) => {
    for (const k of keys) {
      const av = a[k.col], bv = b[k.col];
      if (av === bv) continue;
      if (av == null) return k.nullsFirst ? -1 : 1;
      if (bv == null) return k.nullsFirst ? 1 : -1;
      const c = av < bv ? -1 : 1;
      return k.desc ? -c : c;
    }
    return 0;
  });
}

function whoIs(req) {
  const auth = req.headers.authorization ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (token === SERVICE_KEY) return { service: true, userId: null };
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return { service: false, userId: payload.sub };
  } catch {
    return { service: false, userId: null };
  }
}

// RLS שהאפליקציה סומכת עליו בקריאה: תגובות — רק שלי; תמונות — רק ready.
function rls(table, rows, who) {
  if (who.service) return rows;
  if (table === "idea_reactions") return rows.filter((r) => r.user_id === who.userId);
  if (table === "memory_photos") return rows.filter((r) => r.status === "ready");
  return rows;
}

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  res.writeHead(status, { "content-type": isBuf ? "image/jpeg" : "application/json", ...headers });
  res.end(isBuf ? body : body === undefined ? "" : JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const who = whoIs(req);

  if (url.pathname === "/auth/v1/user") {
    if (!who.userId) return send(res, 401, { message: "no session" });
    return send(res, 200, db.users[who.userId]);
  }

  const storage = url.pathname.match(/^\/storage\/v1\/object\/(?:authenticated\/)?[^/]+\/(.+)$/);
  if (storage) {
    const img = db.objects[decodeURIComponent(storage[1])];
    return img ? send(res, 200, img) : send(res, 404, { message: "not found" });
  }

  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
  if (rpc) {
    const args = req.method === "GET" ? Object.fromEntries(url.searchParams) : await readBody(req);
    const fn = db.rpc[rpc[1]];
    return send(res, 200, fn ? fn(args, who) : null);
  }

  const table = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
  if (table) {
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 201, []);
    const name = table[1];
    let rows = rls(name, db.tables[name] ?? [], who);
    for (const f of parseFilters(url.searchParams)) rows = rows.filter((r) => matches(r, f));
    rows = applyOrder(rows, url.searchParams.get("order"));
    const total = rows.length;
    const limit = url.searchParams.get("limit");
    if (limit) rows = rows.slice(0, Number(limit));
    const headers = { "content-range": `0-${Math.max(0, rows.length - 1)}/${total}` };
    if (req.method === "HEAD") { res.writeHead(200, headers); return res.end(); }
    return send(res, 200, rows, headers);
  }

  send(res, 404, { message: `fake-supabase: ${req.method} ${url.pathname}` });
});

server.listen(PORT, () => console.log(`fake supabase on :${PORT} (me=${ME})`));
