//constants in config.js

// Utility functions
function getJWTToken() {
    return localStorage.getItem('jwt');
}

function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
            console.error('Error decoding JWT:', error);
        return null;  // Return null or handle it as needed
    }
}

function isTokenExpired(token) {
    try {
        const { exp } = decodeJWT(token);
        return Date.now() >= exp * 1000;
    } catch (error) {
        return true;
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}


// Smooth scrolling for internal anchor links
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    // Check if the link is an internal anchor (starts with #)
    if (this.getAttribute('href').startsWith('#')) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
    }
    // If it's a link to another page, don't prevent default
  });
});

// Toggle Dropdown
function toggleDropdown() {
  const dropdown = document.getElementById('dropdownMenu');
  dropdown.classList.toggle('active');
}
// Close dropdown if clicked outside the dropdown and button
window.addEventListener('click', function (event) {
  const dropdown = document.getElementById('dropdownMenu');
  const button = document.getElementById('dropdownButton'); 
  const username = document.getElementById('activeUser');
  if (!dropdown.contains(event.target) && !button.contains(event.target) && !username.contains(event.target)) {
    dropdown.classList.remove('active');
  }
});

// Footer visibility on scroll
const footer = document.querySelector('.footer-content');
if (footer) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            footer.classList.toggle('p-visible', entry.isIntersecting);
        });
    });
    observer.observe(footer);
}

// Smooth scroll buttons
document.getElementById('scroll-up')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
document.getElementById('scroll-down')?.addEventListener('click', () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
});

// Dialog handling
document.querySelectorAll('.open-dialog').forEach(button => {
    button.addEventListener('click', function () {
        document.getElementById(this.getAttribute('data-dialog')).style.display = 'block';
    });
});
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        this.closest('.dialog').style.display = 'none';
    });
});
window.addEventListener('click', event => {
    if (event.target.classList.contains('dialog')) {
        event.target.style.display = 'none';
    }
});

// Check if notifications are enabled or denied
if ('Notification' in window) {
    const notifBtn = document.getElementById('enable-notifications');

    if (Notification.permission === 'denied') {
        if (notifBtn) {
            notifBtn.style.display = 'block';
            notifBtn.addEventListener('click', async () => {
                alert('We need your permission to send you notifications.');
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    notifBtn.style.display = 'none';
                    location.reload();
                } else {
                    alert('Notification permission denied! Enable it from the site settings.');
                }
            });
        }
    } else if (Notification.permission === 'default') {
        console.log('Notification permission has not been requested yet.');
    }
} else {
    console.error('Push notifications are not supported in this browser.');
}



async function clearSubscriptions() {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                console.log('Previous subscription cleared.');
            }
        }
    }
}


async function ensureCorrectSubscription(registration, userId) {
    try {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            // Fetch user ID tied to the subscription from the server
            const response = await fetch(`${BASE_URL}/subscription-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getJWTToken()}`,
                },
                body: JSON.stringify({ endpoint: subscription.endpoint }),
            });

            if (response.ok) {
                const { serverUserId } = await response.json();

                // Check if the subscription belongs to the logged-in user
                if (serverUserId === userId) {
                    console.log('Subscription matches the logged-in user.');
                    return true; // Subscription is valid
                }

                console.log('Subscription does not match the logged-in user. Clearing it.');
                await subscription.unsubscribe();
            } else {
                console.error('Failed to verify subscription on the server:', response.statusText);
            }
        }
    } catch (error) {
        console.error('Error while ensuring correct subscription:', error);
    }

    return false; // Subscription needs to be recreated
}


if ('serviceWorker' in navigator && 'PushManager' in window) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/nihongo/service-worker.js');
            console.log('Service Worker registered with scope:', registration.scope);

            const token = getJWTToken();
            const userId = decodeJWT(token).userId;

            const isSubscriptionValid = await ensureCorrectSubscription(registration, userId);
            if (!isSubscriptionValid) {
                await subscribeUserToPush(registration, userId);
            }
        } catch (error) {
            console.error('Error during service worker or subscription setup:', error);
        }
    });
}


async function subscribeUserToPush(registration, userId) {
    const token = getJWTToken();
    if (!token || isTokenExpired(token)) {
        console.error('No valid JWT token found. Subscription cannot be made.');
        return;
    }

    try {
        const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
        });
 //       const userAgent = navigator.userAgent;
//   	 console.log(deviceInfo);      // This will give the user agent string
//		newSubscription.deviceInfo = deviceInfo;
        newSubscription.userId = userId;

        await fetch(`${BASE_URL}/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(newSubscription),
        });

        console.log('New subscription sent to the server:', newSubscription);
    } catch (error) {
        console.error('Failed to subscribe user to push:', error);
    }
}


// User Authentication
function updateActiveUser() {
    const activeUser = document.getElementById('activeUser');
    const activeUser2 = document.getElementById('activeUser2');
    const token = getJWTToken();

    if (token && !isTokenExpired(token)) {
        try {
            const { username } = decodeJWT(token);
            activeUser.textContent = username || 'No user';
            activeUser2.textContent = username || 'No user';
        } catch {
            activeUser.textContent = 'No user';
        }
    } else {
        activeUser.textContent = 'No user';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const token = getJWTToken();

    if (!token || isTokenExpired(token)) {

    } else {
        updateActiveUser();
    }
});

// login and sign-up text listen
const loginHere = document.getElementById("login-here");
const signupHere = document.getElementById("signup-here");
let captchaLoaded = false; // Track whether the captcha has been loaded

// Utility: Check if the environment is local
function isLocalHost() {
    const hostname = window.location.hostname;
    return hostname === '' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
}

// Utility: Display error message
function showErrorMessage(elementId, message) {
    const errorMessage = document.getElementById(elementId);
    if (errorMessage) errorMessage.textContent = message;
}

// Utility: Get Turnstile token
function getTurnstileToken(elementId) {
    const turnstileElement = document.getElementById(elementId);
    if (!turnstileElement) {
        console.error(`Turnstile element with ID "${elementId}" not found.`);
        return null;
    }
    return turnstile.getResponse(turnstileElement);
}

// Utility: Load captcha dynamically
function loadCaptcha(captchaElementId) {
    if (!captchaLoaded) {
        const captchaElement = document.getElementById(captchaElementId);
        if (captchaElement) {
            captchaElement.classList.remove('cf-turnstile'); // Initially hide captcha
            captchaElement.classList.add('cf-turnstile-visible'); // Show captcha smoothly
            captchaLoaded = true; // Mark captcha as loaded
        }
    }
}

// Toggle between Login and Signup modals
if (window.location.pathname === '/nihongo/') {
    loginHere.addEventListener("click", () => {
        document.getElementById("login-modal").style.display = "flex";
        document.getElementById("signup-modal").style.display = "none";
        captchaLoaded = false; // Reset captcha load state on switching to login
    });

    signupHere.addEventListener("click", () => {
        document.getElementById("signup-modal").style.display = "flex";
        document.getElementById("login-modal").style.display = "none";
        captchaLoaded = false; // Reset captcha load state on switching to signup
    });

    // Display local environment message
    if (isLocalHost()) {
        showErrorMessage('loginErrorMessage', 'Using Local Environment, Skipping Turnstile Verification');
        showErrorMessage('signupErrorMessage', 'Using Local Environment, Skipping Turnstile Verification');
        console.log('Using Local Environment, Skipping Turnstile Verification');
    }

    // Handle Signup Form Submission
    document.getElementById('signup-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('signup-username').value.trim();
        const password = document.getElementById('signup-password').value.trim();
        const errorMessageId = 'signupErrorMessage';

        if (!username || !password) {
            showErrorMessage(errorMessageId, 'Please enter both username and password.');
            return;
        }

        showErrorMessage(errorMessageId, 'Creating Account, Please Wait...');
        let turnstileResponse = null;

        if (!isLocalHost()) {
            loadCaptcha('turnstile1'); // Dynamically load captcha on form submission
            turnstileResponse = getTurnstileToken('turnstile1');
            if (!turnstileResponse) {
                showErrorMessage(errorMessageId, 'Turnstile verification failed.');
                return;
            }
        }

        try {
            const response = await fetch(`${BASE_URL}/create-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, turnstileResponse })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('jwt', data.token);
                console.log('JWT Token:', data.token);
                alert(`User created successfully! (${username})`);
                document.getElementById('signup-modal').style.display = 'none';
                location.reload();
            } else {
                showErrorMessage(errorMessageId, data.error || 'Something went wrong!');
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage(errorMessageId, 'Error connecting to the server. Please try again.');
        }
    });

    // Handle Login Form Submission
    document.getElementById('login-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const errorMessageId = 'loginErrorMessage';

        if (!username || !password) {
            showErrorMessage(errorMessageId, 'Please enter both username and password.');
            return;
        }

        showErrorMessage(errorMessageId, 'Logging In, Please Wait...');
        let turnstileResponse = null;

        if (!isLocalHost()) {
            loadCaptcha('turnstile2'); // Dynamically load captcha on form submission
            turnstileResponse = getTurnstileToken('turnstile2');
            if (!turnstileResponse) {
                showErrorMessage(errorMessageId, 'Turnstile verification failed.');
                return;
            }
        }

        try {
            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, turnstileResponse })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('jwt', data.token);
                console.log('JWT Token:', data.token);
                alert(`Welcome back, ${username}!`);
                document.getElementById('login-modal').style.display = 'none';
                location.reload();
            } else {
                showErrorMessage(errorMessageId, data.error || 'Invalid username or password.');
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage(errorMessageId, 'Error connecting to the server. Please try again.');
        }
    });
}



// Fetch and display user subscriptions in the dropdown
async function fetchSubscriptions() {
    const token = getJWTToken(); // Assumes you have a function to get the JWT token

    if (!token) {
        console.error('No valid token. Cannot fetch subscriptions.');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/user/subscriptions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch subscriptions:', await response.text());
            return;
        }

        const subscriptions = await response.json();

        const dropdown = document.getElementById('notification-dropdown');
        dropdown.innerHTML = ''; // Clear existing list

        if (subscriptions.length === 0) {
            dropdown.innerHTML = '<h3>No active subscriptions found.</h3>';
            return;
        }
			const heading = document.createElement('h3');
			heading.textContent = 'Active Subscriptions';
			heading.classList.add('dropdown-heading'); // Optional: Add a class for styling
			dropdown.appendChild(heading);
			
        	subscriptions.forEach(subscription => {
            const listItem = document.createElement('div');
            listItem.classList.add('subscription-item');

            const subscriptionInfo = document.createElement('span');
            subscriptionInfo.textContent = `Device: ${subscription.deviceInfo || 'Unknown Device'}, IP: ${subscription.ipAddress || 'Unknown IP'}, Last Active: ${new Date(subscription.lastActive).toLocaleString() || 'Unknown'}`;

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteSubscription(subscription.endpoint);

            listItem.appendChild(subscriptionInfo);
            listItem.appendChild(deleteButton);

            dropdown.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
    }
}

// Delete a subscription
async function deleteSubscription(endpoint) {
    const token = getJWTToken();

    if (!token) {
        console.error('No valid token. Cannot delete subscription.');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/unsubscribe`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ endpoint }),
        });

        if (!response.ok) {
            console.error('Failed to delete subscription:', await response.text());
            return;
        }

        console.log('Subscription deleted successfully.');
        fetchSubscriptions(); // Refresh the list
    } catch (error) {
        console.error('Error deleting subscription:', error);
    }
}

// Call fetchSubscriptions when the page loads or when a user is logged in
window.addEventListener('load', () => {
    fetchSubscriptions(); // Fetch and display subscriptions
});



// log-out functionality 
const logoutButton = document.getElementById('logout-btn');
// Show the logout button if the user is logged in
function checkLoginStatus() {
    const token = localStorage.getItem('jwt');
    if (token) {
        logoutButton.style.display = 'block'; // Show the logout button
    } else {
        logoutButton.style.display = 'none'; // Hide the logout button
    }
}

// Logout function
logoutButton.addEventListener('click', async () => {
    await clearSubscriptions();
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('user_data');
    location.reload();
    window.location.href = '/nihongo'; // Redirect to the desired page
});


// Call checkLoginStatus to ensure the logout button is shown when appropriate
checkLoginStatus();



// header js

// Toggle notification dropdown
const notificationBtn = document.getElementById("notification-active");
const notificationDropdown = document.getElementById("notification-dropdown");

notificationBtn.addEventListener("click", () => {
  notificationDropdown.style.display = notificationDropdown.style.display === "block" ? "none" : "block";
});

// user icon

const imageSources = [
    '/nihongo/img/dp/icon1.png',
    '/nihongo/img/dp/icon2.png',
    '/nihongo/img/dp/icon3.png',
    '/nihongo/img/dp/icon4.png',
    '/nihongo/img/dp/icon5.png',
    '/nihongo/img/dp/icon6.png',
    '/nihongo/img/dp/icon7.png',
    '/nihongo/img/dp/icon8.png'
];

window.onload = function () {
    const savedImage = localStorage.getItem('profileImage');
    const img = document.getElementById('profileImg');
    img.src = savedImage && imageSources.includes(savedImage) ? savedImage : imageSources[0]; // Default to first image if none saved
};

function changeImage() {
    const img = document.getElementById('profileImg');

    // Normalize current image source to ensure consistency
    const currentSrc = img.src.replace(location.origin, '');
    const currentIndex = imageSources.findIndex(src => src === currentSrc);

    // Cycle to the next image
    const nextIndex = (currentIndex + 1) % imageSources.length;
    const nextSrc = imageSources[nextIndex];
    img.src = nextSrc;

    // Save the selected image source in localStorage
    localStorage.setItem('profileImage', nextSrc);
}

// Surprise Button Interaction
document.getElementById("surprise-button").addEventListener("click", function() {
  // Show the surprise message
  document.getElementById("surprise-message").classList.add("show");

  // Show the party (balloons and confetti)
  const party = document.getElementById("party");
  party.classList.remove("hidden");

    const container = document.getElementById('confetti-container');
    const colors = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];

    function createConfetti() {
      for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');

        // Random horizontal position
        confetti.style.left = Math.random() * 100 + 'vw'; 

        // Random vertical position
        confetti.style.top = Math.random() * 100 + 'vh'; 

        // Random background color
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        // Random animation delay
        confetti.style.animationDelay = Math.random() * 3 + 's'; 

        // Random size
        const size = Math.random() * 10 + 5; 
        confetti.style.width = size + 'px';
        confetti.style.height = size + 'px';

        container.appendChild(confetti);
      }
    }

    createConfetti();

  // Fade in the party elements
  setTimeout(function() {
    party.style.opacity = 1;
  }, 100);


    // Change button text to indicate surprise was unlocked
  this.textContent = "Wow, look at that! 🎉";
  this.disabled = true; // Disable the button after clicking

  // Optional: Play a sound for added fun
  // new Audio('path/to/party-sound.mp3').play();

});
