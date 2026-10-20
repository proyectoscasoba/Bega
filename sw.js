const CACHE_NAME = "practicas-gnosticas-v23";

const APP_SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "images/cristo-pantocrator-sinai.jpg",
  "images/logos.png",
  "images/V. M. Lakhsmi Daimon.jpeg",
  "images/V. M. Samael Aun Weor.jpg"
];

// Nombres exactos en minúsculas coincidiendo con tu index.html
const AUDIO_ASSETS = [
  "audio/asistencia de la monada divina.mp3",
  "audio/cambio de pareja.mp3",
  "audio/culto a la madre.mp3",
  "audio/el divino daimon y el ego.mp3",
  "audio/el estado emocional y el yo.mp3",
  "audio/el negocio piramidal.mp3",
  "audio/el quinto elemento.mp3",
  "audio/el valor exacto del silencio.mp3",
  "audio/huesped en el corazon de dios.mp3",
  "audio/inspiracion individual.mp3",
  "audio/integracion con dios.mp3",
  "audio/integracion natural.mp3",
  "audio/la comprension del yo psi.mp3",
  "audio/la cultura gnostica - eleuterio martinez.mp3",
  "audio/la cultura gnostica 2.mp3",
  "audio/la obra es imposible.mp3",
  "audio/la recurrencia.mp3",
  "audio/las peores adversidades.mp3",
  "audio/los extraterrestres.mp3",
  "audio/lucifer-moises.mp3",
  "audio/mantram belilin.mp3",
  "audio/matrimonios.mp3",
  "audio/meditacion con el padre nuestro.mp3",
  "audio/meditar en el padre nuestro.mp3",
  "audio/mensaje de juan capasso - juan capasso pinto.mp3",
  "audio/mi corazon los distinque.mp3",
  "audio/nada es regalado.mp3",
  "audio/oracion a la divina madre.mp3",
  "audio/oracion de curacion.mp3",
  "audio/oracion especial 1.mp3",
  "audio/oracion universal.mp3",
  "audio/poderoso sahumerio de limpieza.mp3",
  "audio/practica con lucifer.mp3",
  "audio/practica especial de año nuevo.mp3",
  "audio/practicad - v. m. samael aun weor.mp3",
  "audio/regreso al padre interno.mp3",
  "audio/sanacion para nuestros males.mp3",
  "audio/sobre los maestros.mp3",
  "audio/talisman esoterico.mp3",
  "audio/trabajo especial con el cristo lucifer.mp3",
  "audio/trascender la recurrencia.mp3",
  "audio/vencer al diablo.mp3"
];

const CACHEABLE_EXTERNAL_ORIGINS = [
  "https://www.gstatic.com",
  "https://cdn.tailwindcss.com",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com"
];

// Instalar App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(
        APP_SHELL.map((asset) => new URL(asset, self.registration.scope).href)
      )
    )
  );
  self.skipWaiting();
});

// Activar y limpiar versiones viejas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Proceso en segundo plano para precargar todos los audios y avisar al index.html
let audioCacheTask;

const cacheAudioLibrary = async () => {
  const cache = await caches.open(CACHE_NAME);
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });
  let completed = 0;
  let failed = 0;

  const report = (done = false) => {
    const message = {
      type: "AUDIO_CACHE_PROGRESS",
      completed,
      failed,
      total: AUDIO_ASSETS.length,
      done
    };
    clients.forEach((client) => client.postMessage(message));
  };

  report();

  for (const asset of AUDIO_ASSETS) {
    const url = new URL(asset, self.registration.scope).href;
    try {
      if (!(await cache.match(url))) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await cache.put(url, response);
      }
    } catch (err) {
      failed += 1;
    }
    completed += 1;
    report();
  }
  report(true);
};

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_AUDIO_LIBRARY") return;

  if (!audioCacheTask) {
    audioCacheTask = cacheAudioLibrary().finally(() => {
      audioCacheTask = null;
    });
  }
  event.waitUntil(audioCacheTask);
});

// Manejo de peticiones HTTP Range (206 Partial Content) para los audios cacheados
const getRangeResponse = async (request) => {
  const cachedResponse = await caches.match(new Request(request.url));
  const response = cachedResponse || (await fetch(request));
  const rangeHeader = request.headers.get("range");

  if (!rangeHeader || !cachedResponse) return response;

  const rangeMatch = rangeHeader.match(/bytes=(\d*)-(\d*)/);
  if (!rangeMatch) return response;

  const body = await response.arrayBuffer();
  const totalLength = body.byteLength;
  const start = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
  const requestedEnd = rangeMatch[2] ? Number(rangeMatch[2]) : totalLength - 1;
  const end = Math.min(requestedEnd, totalLength - 1);

  if (start >= totalLength || start > end) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${totalLength}` }
    });
  }

  return new Response(body.slice(start, end + 1), {
    status: 206,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${totalLength}`,
      "Content-Type": response.headers.get("Content-Type") || "audio/mpeg"
    }
  });
};

// Evento Fetch
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Si la petición solicita rango (para reproducción de audio)
  if (event.request.headers.has("range")) {
    event.respondWith(getRangeResponse(event.request));
    return;
  }

  // Navegación HTML
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, responseCopy).catch(() => {})
          );
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          if (cachedPage) return cachedPage;
          return caches.match(new URL("./", self.registration.scope));
        })
    );
    return;
  }

  // Estrategia Cache First con fallback a Red
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        const requestOrigin = new URL(event.request.url).origin;
        if (
          networkResponse.ok &&
          (requestOrigin === self.location.origin ||
            CACHEABLE_EXTERNAL_ORIGINS.includes(requestOrigin))
        ) {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, responseCopy).catch(() => {})
          );
        }
        return networkResponse;
      });
    })
  );
});