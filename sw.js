/* Offline-Betrieb: Programmdateien werden auf dem Gerät zwischengespeichert.
   Persönliche Daten laufen nie über diesen Service Worker – sie liegen im lokalen Speicher. */
const CACHE = 'vermoegen-v1';
const FILES = ['./', 'index.html', 'styles.css', 'engine.js', 'engine2.js', 'ui.js', 'views.js', 'views2.js',
  'editors.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
/* Netz zuerst (damit Updates ankommen), sonst aus dem Zwischenspeicher */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
