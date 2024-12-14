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

// login and sign-up text listeners
const loginHere = document.getElementById("login-here");
const signupHere = document.getElementById("signup-here");

// Add click event listeners
if (window.location.pathname === '/nihongo/') {
	
	// General password toggle functionality
function togglePasswordVisibility(event) {
    const passwordField = event.target.previousElementSibling; // Target the input field
    if (passwordField.type === 'password') {
        passwordField.type = 'text'; // Show password
        event.target.classList.remove('fa-eye'); // Change icon to 'eye slash'
        event.target.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password'; // Hide password
        event.target.classList.remove('fa-eye-slash'); // Change icon back to 'eye'
        event.target.classList.add('fa-eye');
    }
}

// Attach the event listener to both login and signup eye icons
document.querySelectorAll('.password-wrapper i').forEach(icon => {
    icon.addEventListener('click', togglePasswordVisibility);
});
	
    loginHere.addEventListener("click", () => {
        document.getElementById("login-modal").style.display = "flex";
        document.getElementById("signup-modal").style.display = "none";
        document.getElementById('login-username').focus(); // Focus on the first input field
    });
    signupHere.addEventListener("click", () => {
        document.getElementById("signup-modal").style.display = "flex";
        document.getElementById("login-modal").style.display = "none";
        document.getElementById('signup-username').focus();
    });

    // Helper functions
    const isValidUsername = (username) => /^[a-zA-Z0-9_-]{3,15}$/.test(username);
    const isStrongPassword = (password) =>
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);

    // New User Creation
    document.getElementById('signup-form').addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.getElementById('signup-username').value.trim();
        const password = document.getElementById('signup-password').value;
        const errorMessage = document.getElementById('signupErrorMessage');
        errorMessage.textContent = 'Creating Account, Please Wait...';

        if (!isValidUsername(username)) {
            errorMessage.textContent = 'Username must be 3-15 characters and contain only letters, numbers, underscores, or hyphens.';
            return;
        }

        if (!isStrongPassword(password)) {
            errorMessage.textContent =
                'Password must be at least 8 characters, include uppercase, lowercase, a number, and a special character.';
            return;
        }

        try {
            const turnstileResponse = turnstile.getResponse(turnstile1);
            if (!turnstileResponse) {
                errorMessage.textContent = 'Please complete the captcha.';
                return;
            }

            const response = await fetch(`${BASE_URL}/create-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, turnstileResponse })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('jwt', data.token);
                alert(`User created successfully! (${username})`);
                document.getElementById('signup-modal').style.display = 'none';
                location.reload();
            } else {
                errorMessage.textContent = data.error || 'Something went wrong!';
            }
        } catch (error) {
            console.error('Error:', error);
            errorMessage.textContent = 'Error connecting to the server. Please try again.';
        }
    });

    // Login Form Submission
    document.getElementById('login-form').addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorMessage = document.getElementById('loginErrorMessage');
        errorMessage.textContent = 'Logging In, Please Wait...';

        if (!username || !password) {
            errorMessage.textContent = 'Please enter both username and password.';
            return;
        }

        try {
            const turnstileResponse = turnstile.getResponse(turnstile2);
            if (!turnstileResponse) {
                errorMessage.textContent = 'Please complete the captcha.';
                return;
            }

            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, turnstileResponse })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('jwt', data.token);
                alert(`Welcome back, ${username}!`);
                document.getElementById('login-modal').style.display = 'none';
                location.reload();
            } else {
                errorMessage.textContent = data.error || 'Invalid username or password.';
            }
        } catch (error) {
            console.error('Error:', error);
            errorMessage.textContent = 'Error connecting to the server. Please try again.';
        }
    });
}