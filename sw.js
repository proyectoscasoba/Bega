const CACHE_NAME = "practicas-gnosticas-v22";
const APP_SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "images/cristo-pantocrator-sinai.jpg",
  "images/logos.jfif",
  "images/V. M. Lakhsmi Daimon.webp",
  "images/V. M. Samael Aun Weor.jpg"
];

const CACHEABLE_EXTERNAL_ORIGINS = [
  "https://www.gstatic.com",
  "https://cdn.tailwindcss.com",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];

// Instalación del App Shell básico
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(
        APP_SHELL.map((asset) => new URL(asset, self.registration.scope).href),
      ),
    ),
  );
  self.skipWaiting();
});

// Activación y limpieza de cachés antiguas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// Interceptación de red optimizada
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // REGLA CLAVE: Excluir por completo los audios del Service Worker en Vercel
  // Esto permite que el navegador y Vercel manejen el streaming de audio nativo sin bloqueos ni rangos rotos.
  if (url.pathname.includes("/audio/") || url.pathname.endsWith(".mp3") || url.pathname.endsWith(".MP3")) {
    return; // Pasa directo a la red de Vercel
  }

  // Manejo para navegación (HTML)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, responseCopy).catch(() => {}),
          );
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          if (cachedPage) return cachedPage;
          return caches.match(new URL("./", self.registration.scope));
        }),
    );
    return;
  }

  // Manejo estándar para recursos estáticos (CSS, JS, imágenes)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        const requestOrigin = url.origin;
        if (
          networkResponse.ok &&
          (requestOrigin === self.location.origin ||
            CACHEABLE_EXTERNAL_ORIGINS.includes(requestOrigin))
        ) {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, responseCopy).catch(() => {}),
          );
        }
        return networkResponse;
      });
    }),
  );
});