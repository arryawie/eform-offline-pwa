/**
 * Service Worker for E-Form Offline Support
 */

const CACHE_NAME = 'eform-v1';
const OFFLINE_URL = '/offline.html';

const URLS_TO_CACHE = [
    '/',
    '/frontend/css/style.css',
    '/frontend/js/app.js',
    '/frontend/js/db.js',
    '/frontend/js/storage.js',
    '/frontend/js/sync.js',
    '/frontend/pages/login.html',
    '/frontend/pages/dashboard.html',
    '/frontend/pages/form.html'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching essential files');
            return cache.addAll(URLS_TO_CACHE);
        }).catch(err => {
            console.error('[SW] Cache install failed:', err);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // API requests - Network first with cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful responses
                    if (response.status === 200) {
                        const cache = caches.open(CACHE_NAME);
                        cache.then(c => c.put(request, response.clone()));
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached response if offline
                    return caches.match(request).then((response) => {
                        if (response) {
                            return response;
                        }
                        // Return offline page as fallback
                        return caches.match(OFFLINE_URL);
                    });
                })
        );
        return;
    }

    // App shell - Cache first with network fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    return response || fetch(request).then((fetchResponse) => {
                        if (fetchResponse.status === 200) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(request, fetchResponse.clone());
                            });
                        }
                        return fetchResponse;
                    }).catch(() => caches.match(OFFLINE_URL));
                })
        );
        return;
    }

    // Static assets - Cache first
    if (request.method === 'GET') {
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    return response || fetch(request).then((fetchResponse) => {
                        if (fetchResponse.status === 200 && fetchResponse.type !== 'error') {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(request, fetchResponse.clone());
                            });
                        }
                        return fetchResponse;
                    }).catch(() => {
                        // Return placeholder for images/other assets
                        if (request.destination === 'image') {
                            return caches.match('/placeholder.png');
                        }
                    });
                })
        );
        return;
    }
});

// Background sync (if supported)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-forms') {
        event.waitUntil(
            // Trigger sync from main thread
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'SYNC_FORMS' });
                });
            })
        );
    }
});
