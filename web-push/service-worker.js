// Listen for the push event
self.addEventListener('push', (event) => {
    if (!event.data) {
        console.error('Push event received without data');
        return;
    }

    let data = {};
    try {
        data = event.data.json();
    } catch (error) {
        console.error('Failed to parse push event data as JSON:', error);
        return;
    }

    const { title = 'New Notification', body = 'You have a new message!', icon = '/nihongo/icon.png', image = null, url = '/nihongo/' } = data;

    const options = {
        body,
        icon,
        image,  // Optional: Use image if provided in the payload
        data: { url },  // Attach URL data for the notification
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
            .then(() => {
                console.log('Notification shown successfully.');
            })
            .catch((error) => {
                console.error('Error showing notification:', error);
            })
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    let url = '/nihongo/'; // Default fallback URL
    try {
        const data = event.notification.data || {};
        url = new URL(data.url || '/nihongo/', location.origin).toString(); // Sanitize the URL
    } catch (error) {
        console.error('Error processing notification click data:', error);
    }

    event.waitUntil(
        clients.openWindow(url).catch((error) => {
            console.error('Error opening the window:', error);
            // Fallback in case opening the URL fails
            clients.openWindow('/nihongo/');
        })
    );
});

// Caching resources for offline use
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('v1').then((cache) => {
            return cache.addAll([
                '/nihongo/',
                '/nihongo/index.html',
                '/nihongo/styles.css',
                '/nihongo/script.js',
                '/nihongo/header-footer/header.js',
                '/nihongo/web-push/icon.png',
                '/nihongo/web-push/default.png',
                '/nihongo/offline.html',  // Make sure this page exists or is provided
            ]);
        }).catch((error) => {
            console.error('Error caching resources during installation:', error);
        })
    );
});

// Activate event to clear old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = ['v1']; // Add your cache version
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event to serve cached content when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request).catch((error) => {
                console.error('Error fetching resource:', error);
                // Optionally serve a fallback page if the network is unavailable
                return caches.match('/nihongo/offline.html');
            });
        })
    );
});

// Background Sync (optional, if you need background sync for offline functionality)
self.addEventListener('sync', (event) => {
    if (event.tag === 'syncData') {
        // Handle sync logic here (e.g., syncing data from offline to the server)
        console.log('Syncing data in the background...');
    }
});