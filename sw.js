const CACHE = "thai-letters-v35";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/tokens.css",
  "./css/base.css",
  "./css/browse.css",
  "./css/modal.css",
  "./css/combo.css",
  "./data/consonants.js",
  "./data/vowels.js",
  "./data/tones.js",
  "./data/combos.js",
  "./js/combo.js",
  "./js/main.js",
  "./js/audio.js",
  "./data/speech.js",
  "./js/browse.js",
  "./js/modal.js",
  "./js/stroke-sample.js",
  "./data/stroke-mono.js",
  "./data/stroke-glyphs.js",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    // reload: skip the browser HTTP cache so a new version never pins an old file
    caches.open(CACHE).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: "reload" }))))
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
  // Pronunciation clips go straight to the network: media range requests and Safari
  // playback break when a service worker answers them.
  if (e.request.url.includes("/audio/")) return;
  // Pages go network-first so an expired Cloudflare Access session lands on the login
  // page instead of a cached shell whose audio silently fails; cache only when offline.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
