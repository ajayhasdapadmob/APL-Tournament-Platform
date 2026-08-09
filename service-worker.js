const CACHE_NAME = "apl-tournament-v1";

const APP_FILES = [
    "./",
    "./index.html",
    "./dashboard.html",
    "./profile.html",
    "./create-tournament.html",
    "./my-tournaments.html",
    "./tournament.html",
    "./registration.html",
    "./admin.html",
    "./schedule.html",
    "./results.html",
    "./points.html",
    "./playerstats.html",
    "./orange.html",
    "./purple.html",
    "./live.html",
    "./contact.html",
    "./receipt.html",
    "./manifest.json",

    "./css/style.css",
    "./css/dashboard.css",
    "./css/profile.css",
    "./css/tournament.css",
    "./css/admin.css"
];

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(APP_FILES);

            })

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

                const copy =
                    response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {

                        cache.put(
                            event.request,
                            copy
                        );

                    });

                return response;

            })
            .catch(() => {

                return caches.match(
                    event.request
                );

            })

    );

});