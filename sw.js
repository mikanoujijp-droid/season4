/* 学習成果カウンター Season 4: offline support.
   Serves the app from its own cache, then refreshes that cache in the background.
   It only handles files in this folder and only touches caches with this app's prefix. */
var PREFIX = 'gakushu-counter-season4-';
var CACHE = PREFIX + 'v1';
var ASSETS = ['./', './index.html', './manifest.json', './icon-180.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf(new URL('./', self.location.href).pathname) !== 0) return;
  var key = url.origin + url.pathname;   // ignore ?date=… and other query strings

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(key).then(function (cached) {
        var refresh = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(key, res.clone());
          return res;
        });
        if (cached) { refresh.catch(function () {}); return cached; }
        return refresh.catch(function () {
          if (req.mode === 'navigate') return cache.match(new URL('./index.html', self.location.href).href);
          throw new Error('offline');
        });
      });
    })
  );
});
