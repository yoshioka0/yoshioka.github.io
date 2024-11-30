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

// Check if notifications are enabled or denied using notif btn
if ('Notification' in window) {
    if (Notification.permission === 'denied') {
        // Check if the element exists before attempting to show it
        const notifBtn = document.getElementById('enable-notifications');
        if (notifBtn) {
            // Show the floating button if notifications are denied
            notifBtn.style.display = 'block';

            // Event listener for enabling notifications
            notifBtn.addEventListener('click', function() {
                // Show an alert to let the user know why we're asking for permission
                alert('We need your permission to send you notifications.');

                // Request notification permission from the user
                Notification.requestPermission().then(function(permission) {
                    if (permission === 'granted') {
                        // After granting permission, hide the floating button
                        notifBtn.style.display = 'none';

                        // Optionally, subscribe the user for push notifications here
                        // You could call your subscribeUserToPush() function
                        console.log('Notification permission granted!');
                        location.reload();
                    } else {
                        // If the user still denies, keep the button visible
                        console.log('Notification permission denied!');
                        alert('Notification permission denied! Enable it from the site settings.');
                    }
                });
            });
        }
    }
} else {
    console.log('Push notifications are not supported in this browser.');
    alert('Push notifications are not supported in this browser.');
}



async function subscribeUserToPush(registration) {
    const token = getJWTToken();
    if (!token || isTokenExpired(token)) {
        console.error('No valid JWT token found. Subscription cannot be made.');
        return;
    }

    try {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
        });

        const userId = decodeJWT(token).userId; // Get userId from the decoded JWT
        subscription.userId = userId;

        await fetch(`${BASE_URL}/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getJWTToken()}`,
            },
            body: JSON.stringify(subscription),
        });

        console.log('Subscription sent to the server:', subscription);
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

// Add a click event listener
if (window.location.pathname === '/nihongo/') {
	
		loginHere.addEventListener("click", () => {
		document.getElementById("login-modal").style.display = "flex";
		document.getElementById("signup-modal").style.display = "none";
		});
		signupHere.addEventListener("click", () => {
		document.getElementById("signup-modal").style.display = "flex";
		document.getElementById("login-modal").style.display = "none";
		});
		
		
		
		// Helper function to check if the hostname is local
		function isLocalHost() {
		    const hostname = window.location.hostname;
		    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '192.168.1.7'; // Add any additional local hostnames here
		}
		if (isLocalHost()) {
			const errorMessage = document.getElementById('loginErrorMessage');
			const errorMessage2 = document.getElementById('signupErrorMessage'); 
			errorMessage.textContent = 'Using Local Environment, Skipping Turnstile Verification';
			errorMessage2.textContent = 'Using Local Environment, Skipping Turnstile Verification';
			console.log('Using Local Environment, Skipping Turnstile Verification');        
		    }
		
		
		// New User Creation
		document.getElementById('signup-form').addEventListener('submit', async (event) => {
		    event.preventDefault();
		
		    const username = document.getElementById('signup-username').value.trim();
		    const password = document.getElementById('signup-password').value;
		    const errorMessage = document.getElementById('signupErrorMessage'); 
		    errorMessage.textContent = 'Creating Account, Please Wait...';
		
		    // Only get Turnstile token if not in local environment
		    let turnstileResponse = null;
		    if (!isLocalHost()) {
		        turnstileResponse = document.querySelector('.cf-turnstile').dataset.response;
		    }
		
		    if (!username) {
		        errorMessage.textContent = 'Please enter a username.';
		        return;
		    }
		
		    // Skip Turnstile check if in local environment
		    if (!isLocalHost() && !turnstileResponse) {
		        errorMessage.textContent = 'N: CAPTCHA verification failed. Please try again.';
		        return;
		    }
		
		    try {
		        const response = await fetch(`${BASE_URL}/create-user`, {
		            method: 'POST',
		            headers: { 'Content-Type': 'application/json' },
		            body: JSON.stringify({ username, password, turnstileResponse }) // Include Turnstile token only if needed
		        });
		        const data = await response.json();
		        if (response.ok) {
		            localStorage.setItem('jwt', data.token);
		            console.log('JWT Token:', data.token);
		            updateActiveUser();
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
		
		    // Only get Turnstile token if not in local environment
		    let turnstileResponse = null;
		    if (!isLocalHost()) {
		        turnstileResponse = document.querySelector('.cf-turnstile').dataset.response;
		    }
		
		    if (!username || !password) {
		        errorMessage.textContent = 'Please enter both username and password.';
		        return;
		    }
		
		    // Skip Turnstile check if in local environment
		    if (!isLocalHost() && !turnstileResponse) {
		        errorMessage.textContent = 'N: CAPTCHA verification failed. Please try again.';
		        return;
		    }
		
		    try {
		        const response = await fetch(`${BASE_URL}/login`, {
		            method: 'POST',
		            headers: { 'Content-Type': 'application/json' },
		            body: JSON.stringify({ username, password, turnstileResponse }) // Include Turnstile token only if needed
		        });
		        const data = await response.json();        
		        if (response.ok) {
		            localStorage.setItem('jwt', data.token);
		            console.log('JWT Token:', data.token);
		            updateActiveUser();
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
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('jwt');
    // Optionally, clear any other data (like user info, etc.)
    sessionStorage.removeItem('user_data');  // If you are using sessionStorage
    location.reload();
    window.location.href = '/nihongo'; // You can set this to any desired page, like '/login'
});

// Call checkLoginStatus to ensure the logout button is shown when appropriate
checkLoginStatus();

// header js
// Toggle notification dropdown
const notificationBtn = document.getElementById("notification-btn");
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