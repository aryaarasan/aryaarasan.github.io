const CACHE = "aryanews-v2";                          // ← bumped; kills old v1 cache
const ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = e.request.url;

  // Network-first for Google Sheets data
  if (url.includes("docs.google.com")) {
    e.respondWith(
      fetch(e.request).catch(() => new Response("[]", { headers: { "Content-Type": "application/json" }}))
    );
    return;
  }

  // Network-first for HTML — ensures code changes always take effect immediately
  if (e.request.destination === "document" || url.endsWith(".html") || url.endsWith("/")) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))   // fall back to cache only if offline
    );
    return;
  }

  // Cache-first for everything else (fonts, icons, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
