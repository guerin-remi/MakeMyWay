// service-worker.js
const CACHE_NAME = 'makemyway-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './assets/css/main.css',
  './assets/css/components/panel.css',
  './assets/css/components/map.css',
  './assets/css/components/results.css',
  './assets/js/main.js',
  './assets/js/config.js',
  './assets/js/modules/ApiService.js',
  './assets/js/modules/MapManager.js',
  './assets/js/modules/UIManager.js',
  './assets/js/modules/RouteGenerator.js',
  './manifest.json',
  // Note : Les URLs externes (Leaflet, FontAwesome) ne sont pas mises en cache ici.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});