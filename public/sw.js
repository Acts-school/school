const CACHE_NAME = "schoolama-pwa-v1";
// Only cache stable static assets here. Do NOT cache "/" because it may
// respond with a redirect (e.g. auth redirect), which breaks navigation
// when served from the service worker cache.
const URLS_TO_CACHE = ["/favicon.ico", "/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

   // For top-level navigations (HTML documents), let the network handle
   // redirects and navigation logic directly. This avoids issues where a
   // cached redirect response for "/" causes a navigation failure.
   if (event.request.mode === "navigate") {
     return;
   }

  // Do not interfere with API requests; let them hit the network normally.
  if (url.pathname.startsWith("/api")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request);
    })
  );
});
