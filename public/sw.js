/* The Bucket List — Service Worker.
 *
 * שני תפקידים בלבד:
 *  1. אין אינטרנט: כשניווט לדף נכשל, מציגים את offline.html (דף סטטי בלי
 *     שום תוכן פרטי). שום דף, נתון או תמונה של המשתמש לא נשמרים במטמון —
 *     כל השאר הולך לרשת כרגיל (spec 11.4/12: network-only לתוכן זוגי).
 *  2. התראות (Web Push): מציג את ההתראה, ולחיצה פותחת את המסך הרלוונטי.
 */
const CACHE = "bucket-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate") return; // רק ניווט דפים; כל השאר — הדפדפן כרגיל
  event.respondWith(
    fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "The Bucket List", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "The Bucket List";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      lang: "he",
      dir: "rtl",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || "/";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          return w.focus().then((f) => (f && "navigate" in f ? f.navigate(target) : f));
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
