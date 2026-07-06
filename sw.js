/* Aurora Dental Iqaluit — service worker (offline demo cache) */
const CACHE = 'aurora-iqaluit-v2';
const ASSETS = [
  './', './index.html', './patient.html',
  './css/app.css', './css/patient.css',
  './js/data.js', './js/store.js', './js/i18n.js', './js/weather.js',
  './js/sila.js', './js/app.js', './js/patient.js',
  './icons/icon.svg', './manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || e.request.url.indexOf('api.open-meteo.com') !== -1) return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      });
    }).catch(function () { return caches.match('./index.html'); })
  );
});
