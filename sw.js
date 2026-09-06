// Packplaner Service Worker
// Sorgt dafür, dass die App (Grundgerüst) auch ohne Internetverbindung öffnet.
// Wichtig: Firebase-Anfragen (Login, Cloud-Speichern, Teilen, Gemeinsam packen)
// funktionieren weiterhin NUR mit Verbindung - die werden hier bewusst nicht
// abgefangen, sondern laufen normal über das Netzwerk.

const CACHE_NAME = 'packplaner-cache-v1';

// Kern-Dateien, die beim ersten Besuch sofort vorab zwischengespeichert werden.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './alpenverein.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((err) => console.warn('SW: Vorab-Caching teilweise fehlgeschlagen:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Nur GET-Anfragen behandeln
  if (request.method !== 'GET') return;

  // Nur Anfragen an die eigene Origin cachen (GitHub Pages).
  // Firebase/Google-APIs (andere Origin) laufen unangetastet übers Netzwerk.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Aus dem Cache sofort ausliefern (schnell + offline-fähig),
      // im Hintergrund aber die neueste Version nachladen und cachen.
      return cachedResponse || networkFetch;
    })
  );
});
