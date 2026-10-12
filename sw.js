/* Offline support. Bump VERSION whenever you change any app file so phones pick up the update. */
const VERSION = "sm-v1";
const SHELL = [
  "./",
  "index.html",
  "css/app.css",
  "js/plan.js",
  "js/app.js",
  "manifest.webmanifest",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isFont = url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com";
  if (url.origin !== location.origin && !isFont) return;
  // App files: serve from cache, refresh in the background. Fonts: same idea.
  e.respondWith(caches.open(VERSION).then(cache =>
    cache.match(req, {ignoreSearch: true}).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
        return res;
      }).catch(() => hit || (req.mode === "navigate" ? cache.match("index.html") : undefined));
      return hit || net;
    })
  ));
});
