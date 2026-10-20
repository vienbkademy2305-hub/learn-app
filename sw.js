// Service worker tối giản: mở lại app khi mạng yếu. Không cache audio (quá nặng).
const CACHE = "hnn-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (/\/assets\/(audio|en-audio)\//.test(url.pathname) || /\.(mp3|wav|ogg|m4a)$/.test(url.pathname)) return;

  const immutable = url.pathname.includes("/_next/static/");
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (immutable && hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        if (hit) return hit;
        throw err;
      }
    }),
  );
});

// Nhắc học (Web Push): hiện thông báo và mở trang "Hôm nay" khi bấm.
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {}
  const base = new URL(self.registration.scope).pathname.replace(/\/$/, "");
  e.waitUntil(
    self.registration.showNotification(d.title || "Đến giờ học rồi 🔥", {
      body: d.body || "Hôm nay bạn chưa học.",
      icon: `${base}/icons/icon-192.png`,
      tag: "nhac-hoc",
      data: { url: `${base}${d.url || "/hom-nay/"}` },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.navigate(url).then(() => c.focus());
      return self.clients.openWindow(url);
    }),
  );
});

// Nhắc học (Web Push): hiện thông báo và mở trang "Hôm nay" khi bấm.
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {}
  const base = new URL(self.registration.scope).pathname.replace(/\/$/, "");
  e.waitUntil(
    self.registration.showNotification(d.title || "Đến giờ học rồi 🔥", {
      body: d.body || "Hôm nay bạn chưa học.",
      icon: `${base}/icons/icon-192.png`,
      tag: "nhac-hoc",
      data: { url: `${base}${d.url || "/hom-nay/"}` },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.navigate(url).then(() => c.focus());
      return self.clients.openWindow(url);
    }),
  );
});
