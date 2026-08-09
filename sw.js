const CACHE_NAME = "apl-tournament-v1";


const FILES_TO_CACHE = [

    "./",

    "./index.html",

    "./manifest.json",

    "./css/style.css",

    "./images/icon-192.png",

    "./images/icon-512.png"

];


/* =========================
   INSTALL
========================= */

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches.open(
                CACHE_NAME
            )
            .then(
                cache => {

                    return cache.addAll(
                        FILES_TO_CACHE
                    );

                }
            )

        );


        self.skipWaiting();

    }
);


/* =========================
   ACTIVATE
========================= */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches.keys()
            .then(
                cacheNames => {

                    return Promise.all(

                        cacheNames
                        .filter(
                            name =>
                                name !==
                                CACHE_NAME
                        )
                        .map(
                            name =>
                                caches.delete(
                                    name
                                )
                        )

                    );

                }
            )

        );


        self.clients.claim();

    }
);


/* =========================
   FETCH
========================= */

self.addEventListener(
    "fetch",
    event => {

        event.respondWith(

            fetch(
                event.request
            )
            .then(
                response => {

                    if (
                        response &&
                        response.status === 200 &&
                        response.type === "basic"
                    ) {

                        const responseClone =
                            response.clone();


                        caches.open(
                            CACHE_NAME
                        )
                        .then(
                            cache => {

                                cache.put(
                                    event.request,
                                    responseClone
                                );

                            }
                        );

                    }


                    return response;

                }
            )
            .catch(
                () => {

                    return caches.match(
                        event.request
                    );

                }
            )

        );

    }
);