/* Tafsir — service worker
 *
 * Strategy
 *  - App shell (/, /hors-ligne, /hors-ligne/lire) is precached with every
 *    /_next/static asset it references (JS, CSS, fonts).
 *  - /_next/static/*      cache-first (immutable, content-hashed)
 *  - /api/*               network-only (offline data lives in IndexedDB, not here)
 *  - RSC payload requests network-only (Next.js falls back to a full navigation)
 *  - Page navigations     network-first; successful pages are kept (bounded) so
 *                         visited verses reopen offline. When nothing is cached,
 *                         /tafsir/S/A redirects to the IndexedDB-backed reader.
 * Nothing here ever fabricates content: offline pages show only cached or
 * downloaded data.
 */
const VERSION = "v1";
const SHELL = `tafsir-shell-${VERSION}`;
const STATIC = `tafsir-static-${VERSION}`;
const PAGES = `tafsir-pages-${VERSION}`;
const SHELL_URLS = ["/", "/hors-ligne", "/hors-ligne/lire"];
const MAX_PAGES = 80;

async function discoverAssets(response) {
  const html = await response.clone().text();
  const urls = new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || []);
  for (const css of [...urls].filter((u) => u.endsWith(".css"))) {
    try {
      const text = await (await fetch(css)).text();
      for (const u of text.match(/\/_next\/static\/media\/[^"')\s]+/g) || []) urls.add(u);
    } catch {}
  }
  return [...urls];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      const assets = new Set(["/manifest.webmanifest", "/icon.svg"]);
      for (const url of SHELL_URLS) {
        try {
          const res = await fetch(url, { credentials: "same-origin" });
          if (res.ok) {
            await shell.put(url, res.clone());
            for (const a of await discoverAssets(res)) assets.add(a);
          }
        } catch {}
      }
      const stat = await caches.open(STATIC);
      await Promise.allSettled([...assets].map((a) => stat.add(a)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, STATIC, PAGES]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function handleNavigation(request) {
  const url = new URL(request.url);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") {
      const cache = await caches.open(PAGES);
      cache.put(request, res.clone()).then(() => trim(PAGES, MAX_PAGES));
    }
    return res;
  } catch {
    const cached = (await caches.match(request)) || (url.pathname === "/hors-ligne/lire" && (await caches.match("/hors-ligne/lire", { ignoreSearch: true })));
    if (cached) return cached;
    const m = url.pathname.match(/^\/(?:tafsir|comparer)\/(\d{1,3})\/(\d{1,3})\/?$/);
    if (m) {
      const source = url.searchParams.get("source") || (url.searchParams.get("sources") || "").split(",")[0];
      return Response.redirect(`/hors-ligne/lire?s=${m[1]}&a=${m[2]}${source ? `&source=${encodeURIComponent(source)}` : ""}`, 302);
    }
    const s = url.pathname.match(/^\/sourate\/(\d{1,3})\/?$/);
    if (s) return Response.redirect(`/hors-ligne/lire?s=${s[1]}&a=1`, 302);
    return (await caches.match("/hors-ligne")) || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) caches.open(STATIC).then((c) => c.put(request, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
  }
});
