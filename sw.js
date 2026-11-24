var CACHE_VERSION = 'chonqua-v2';
var CORE_ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'data/products.json',
  'data/meta.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_VERSION; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin && url.pathname.indexOf('/data/') !== -1) {
    // network-first for product data, fallback to cache offline
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  if (isSameOrigin) {
    // cache-first for app shell
    event.respondWith(
      caches.match(req).then(function (cached) {
        return cached || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, copy); });
          return res;
        });
      })
    );
    return;
  }

  // cross-origin (product images from the store CDN): stale-while-revalidate
  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, res.clone()); });
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
