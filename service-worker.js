self.addEventListener('install', (event) => {
    console.log('ServiceWorker installed.');
    self.skipWaiting(); // Activate the service worker immediately
});

self.addEventListener('activate', (event) => {
    console.log('ServiceWorker activated.');
    event.waitUntil(self.clients.claim()); // Take control of all open clients
});

// Listen for push events
self.addEventListener('push', (event) => {
    console.log('Push event received:', event);

    let data = {};
    if (event.data) {
        try {
            data = event.data.json(); // Expecting JSON payload
        } catch (e) {
            console.error('Failed to parse push data:', e);
        }
    }

    const title = data.title || 'Notification';
    const options = {
        body: data.body || 'You have a new message!',
        icon: data.icon || '/default-icon.png', // Path to a default icon
        image: data.image || undefined,        // Optional image
        data: data.url || '/',                 // URL to open on notification click
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
    console.log('Notification click event:', event);

    event.notification.close(); // Close the notification

    // Open the URL specified in the notification's data
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            const urlToOpen = event.notification.data;

            // If the URL is already open, focus the tab
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }

            // Otherwise, open a new tab
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Optional: Cleanup or sync tasks
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('Push subscription changed:', event);

    // Automatically resubscribe if necessary
    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY), // Use your VAPID key
        }).then((newSubscription) => {
            // Send the new subscription to the server
            return fetch(`${BASE_URL}/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getJWTToken()}`,
                },
                body: JSON.stringify(newSubscription),
            });
        }).catch((error) => {
            console.error('Failed to resubscribe:', error);
        })
    );
});