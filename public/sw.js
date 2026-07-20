/**
 * Service worker TengeStack.
 *
 * Стратегии:
 * - статика Next (/_next/static) — cache-first: контент-хэши в именах делают
 *   инвалидацию ненужной;
 * - датасет (/data/*.json) — stale-while-revalidate: мгновенный старт с кэша,
 *   свежий снапшот подтягивается фоном и появится при следующем открытии;
 * - навигация — network-first с офлайн-фолбэком на закэшированный шелл.
 */
const VERSION = "v1";
const RUNTIME = `ts-runtime-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // датасет: SWR
  if (url.pathname.startsWith("/data/")) {
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // статика: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // навигация: network-first
  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          const cached = await cache.match(request);
          return cached || cache.match("/");
        }
      }),
    );
  }
});
