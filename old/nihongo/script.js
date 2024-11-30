// Smooth scrolling for internal anchor links
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    // Check if the link is an internal anchor (starts with #)
    if (this.getAttribute('href').startsWith('#')) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    }
    // If it's a link to another page, don't prevent default
  });
});



// Select the footer content
const footer = document.querySelector('.footer-content');

// Create an Intersection Observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      footer.classList.add('p-visible'); // Add class when in view
    } else {
      footer.classList.remove('p-visible'); // Optional: Remove class if out of view
    }
  });
});

// Observe the footer content
observer.observe(footer);

function scrollToPosition(targetPosition) {
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
}

// Scroll button
document.getElementById('scroll-up').addEventListener('click', function () {
  scrollToPosition(0);
});

document.getElementById('scroll-down').addEventListener('click', function () {
  scrollToPosition(document.body.scrollHeight);
});

// Check if notifications are enabled or denied
if ('Notification' in window) {
    if (Notification.permission === 'denied') {
        // Show the floating button if notifications are denied
        document.getElementById('enable-notifications').style.display = 'block';
    }

    // Event listener for enabling notifications
    document.getElementById('enable-notifications').addEventListener('click', function() {
        // Show an alert to let the user know why we're asking for permission
        alert('We need your permission to send you notifications.');

        // Request notification permission from the user
        Notification.requestPermission().then(function(permission) {
            if (permission === 'granted') {
                // After granting permission, hide the floating button
                document.getElementById('enable-notifications').style.display = 'none';

                // Optionally, subscribe the user for push notifications here
                // You could call your subscribeUserToPush() function
                console.log('Notification permission granted!');
            } else {
                // If the user still denies, keep the button visible
                console.log('Notification permission denied!');
                alert('Notification permission denied!');
            }
        });
    });
} else {
    console.log('Push notifications are not supported in this browser.');
    alert('Push notifications are not supported in this browser.');
}

// Open Dialog
document.querySelectorAll('.open-dialog').forEach(button => {
    button.addEventListener('click', function() {
        const dialogId = this.getAttribute('data-dialog');
        document.getElementById(dialogId).style.display = 'block';
    });
});

// Close Dialog
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        this.closest('.dialog').style.display = 'none';
    });
});

// Close dialog if user clicks outside the dialog content
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('dialog')) {
        event.target.style.display = 'none';
    }
});

Notification.requestPermission().then(function(permission) {
    if (permission === "granted") {
        console.log("Notification permission granted.");
    } else {
        console.log("Notification permission denied.");
    }
});

// Service Worker for web-push notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
    // Register the service worker
    navigator.serviceWorker.register('web-push/service-worker.js')
        .then(function(registration) {
            console.log('Service Worker registered with scope:', registration.scope);

            // Check if already subscribed
            registration.pushManager.getSubscription().then(function(subscription) {
                if (subscription) {
                    console.log('Already subscribed:', subscription);
                } else {
                    // Subscribe to push notifications
                    subscribeUserToPush(registration);
                }
            });
        })
        .catch(function(error) {
            console.error('Service Worker registration failed:', error);
        });
} else {
    console.log('Push Notifications are not supported in this browser.');
}

async function subscribeUserToPush(registration) {
    const publicVapidKey = 'BDdr26kHzz40SAgoMRYN6rVLogOqv1p8OoPw-NqX2cCTRrmK_j4YHwHVRvM8xrjw0kAx36ZuHN976uWRB0qGIjI';
    
    // Create a new subscription
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    });

    // Send subscription to your backend
    await fetch('https://nihongo-backend.onrender.com/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
    });

    console.log('Subscription sent to the server:', subscription);
}

// Utility function to convert public VAPID key to a Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}