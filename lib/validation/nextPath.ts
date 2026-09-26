// יעד חזרה אחרי כניסה (/login?next=...) ובדף הנחיתה (/open?next=...).
// רשימה סגורה בלבד — דף תוכנית/רעיון/זיכרון — כדי שאי אפשר יהיה להשתמש
// בקישור של האפליקציה כדי להפנות למקום אחר (open redirect).
const ALLOWED = /^\/(plans|ideas|memories)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function safeNextPath(raw: unknown): string | null {
  return typeof raw === "string" && ALLOWED.test(raw) ? raw : null;
}

export function nextPathKind(path: string): "plan" | "idea" | "memory" {
  return path.startsWith("/plans/") ? "plan" : path.startsWith("/ideas/") ? "idea" : "memory";
}
