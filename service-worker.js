const CACHE_NAME = "apl-tournament-v2";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",

    "./images/icon-192.png",
    "./images/icon-512.png",

    "./css/style.css"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES))
    );

    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

self.addEventListener("fetch", event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {

                const copy = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, copy);
                    });

                return response;

            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});const CACHE_NAME = "apl-tournament-v2";