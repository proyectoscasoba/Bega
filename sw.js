const CACHE_NAME = "practicas-gnosticas-v21";
const APP_SHELL = ["./", "index.html", "manifest.json", "images/cristo-pantocrator-sinai.jpg", "images/logos.jfif", "images/V. M. Lakhsmi Daimon.webp", "images/V. M. Samael Aun Weor.jpg"];
const AUDIO_ASSETS = [
  "audio/Asistencia de la Monada Divina.MP3",
  "audio/Cambio de Pareja.MP3",
  "audio/Culto a la Madre.MP3",
  "audio/El Divino Daimon y el Ego.MP3",
  "audio/El Estado Emocional y el Yo.MP3",
  "audio/El Negocio Piramidal.MP3",
  "audio/El Quinto Elemento.MP3",
  "audio/El Valor Exacto del Silencio.MP3",
  "audio/Huesped en el Corazon de Dios.MP3",
  "audio/Inspiracion Individual.MP3",
  "audio/Integracion con Dios.MP3",
  "audio/Integracion Natural.MP3",
  "audio/La Comprension del YO Psi.MP3",
  "audio/La Cultura Gnostica - Eleuterio Martinez.mp3",
  "audio/La Obra es Imposible.mp3",
  "audio/La Recurrencia.MP3",
  "audio/Los Extraterrestres.MP3",
  "audio/Lucifer-Moises.MP3",
  "audio/Mantram Belilin.mp3",
  "audio/Matrimonios.MP3",
  "audio/Meditacion con el Padre Nuestro.MP3",
  "audio/Meditar en el Padre Nuestro.MP3",
  "audio/Mensaje de Juan Capasso - Juan Capasso Pinto.MP3",
  "audio/Mi Corazon los Distinque.MP3",
  "audio/Nada es Regalado.MP3",
  "audio/Oracion a la Divina Madre.MP3",
  "audio/Oracion de Curacion.MP3",
  "audio/Oracion Especial 1.MP3",
  "audio/Oracion Universal.MP3",
  "audio/Poderoso Sahumerio de Limpieza.mp3",
  "audio/Practica Especial de Año Nuevo.MP3",
  "audio/Practicad - V. M. Samael Aun Weor.mp3",
  "audio/Practica con Lucifer.MP3",
  "audio/Regreso al Padre Interno.MP3",
  "audio/Sobre Los Maestros.MP3",
  "audio/Talisman Esoterico.MP3",
  "audio/Trabajo Especial con el Cristo Lucifer.MP3",
  "audio/Transcender la Recurrencia.MP3",
  "audio/Vencer al Diablo.MP3",
];
const CACHEABLE_EXTERNAL_ORIGINS = [
  "https://www.gstatic.com",
  "https://cdn.tailwindcss.com",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];

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

let audioCacheTask;

const cacheAudioLibrary = async () => {
  const cache = await caches.open(CACHE_NAME);
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  let completed = 0;
  let failed = 0;

  const report = (done = false) => {
    const message = {
      type: "AUDIO_CACHE_PROGRESS",
      completed,
      failed,
      total: AUDIO_ASSETS.length,
      done,
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
    } catch {
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
  const requestedEnd = rangeMatch[2]
    ? Number(rangeMatch[2])
    : totalLength - 1;
  const end = Math.min(requestedEnd, totalLength - 1);

  if (start >= totalLength || start > end) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${totalLength}` },
    });
  }

  return new Response(body.slice(start, end + 1), {
    status: 206,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${totalLength}`,
      "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
    },
  });
};

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.headers.has("range")) {
    event.respondWith(getRangeResponse(event.request));
    return;
  }

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
            cache.put(event.request, responseCopy).catch(() => {}),
          );
        }
        return networkResponse;
      });
    }),
  );
});
