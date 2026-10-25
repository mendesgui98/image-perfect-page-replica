/* Service worker da JMG Obras.
 * Estratégia (Fase 2, etapa 1 — app instalável):
 *  - Páginas: sempre da rede (dados e sessão nunca ficam em cache); sem rede, mostra offline.html.
 *  - Arquivos estáticos com hash (/assets/), ícones e imagens: cache-first.
 *  - Nunca intercepta API (auth/rest/storage), outros domínios nem métodos diferentes de GET.
 * A fila offline de diário/fotos virá numa etapa seguinte, em IndexedDB.
 */
const VERSION = "v1";
const STATIC_CACHE = `jmg-static-${VERSION}`;
const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/jmg-logo-blue.png",
  "/jmg-logo-white.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("jmg-") && k !== STATIC_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const isApi = (url) => /^\/(auth|rest|storage|realtime)\/v1\//.test(url.pathname);
const isStatic = (url) =>
  url.pathname.startsWith("/assets/") ||
  url.pathname.startsWith("/icons/") ||
  /\.(png|jpe?g|svg|webp|ico|woff2?)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isApi(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
