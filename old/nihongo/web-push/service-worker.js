// service-worker.js

// Listen for the push event
self.addEventListener('push', function(event) {
    const data = event.data.json();
    const title = data.title;
    const options = {
        body: data.body,
        icon: 'icon.png',
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});


// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(data.url || '/'));
});