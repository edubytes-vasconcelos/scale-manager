const CACHE_NAME = "app-cache-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 🚫 NÃO cachear extensões, file://, etc
  if (
    req.method !== "GET" ||
    !req.url.startsWith("http")
  ) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, clone).catch(() => {});
        });
        return res;
      })
      .catch(() => caches.match(req))
  );
});
