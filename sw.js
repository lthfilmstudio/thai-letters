const CACHE = "thai-letters-v2";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/tokens.css",
  "./css/base.css",
  "./css/browse.css",
  "./css/modal.css",
  "./css/quiz.css",
  "./css/write.css",
  "./data/consonants.js",
  "./data/vowels.js",
  "./data/tones.js",
  "./js/main.js",
  "./js/audio.js",
  "./js/browse.js",
  "./js/modal.js",
  "./js/quiz.js",
  "./js/write.js",
  "./assets/icons/icon-192.svg",
  "./assets/icons/icon-512.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
