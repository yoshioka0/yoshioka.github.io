// constants in config.js

// Retrieve the JWT token from local storage
function getJWTToken() {
    return localStorage.getItem('jwt');
}

// Decode the JWT token
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

// Check if the token is expired
function isTokenExpired(token) {
    try {
        const { exp } = decodeJWT(token);
        return Date.now() >= exp * 1000;
    } catch (error) {
        return true; // Assume expired if decoding fails
    }
}

// Logout user and clear token
function logout() {
    localStorage.removeItem('jwt');

    if (window.location.pathname === '/nihongo/') {
        document.getElementById('signup-modal').style.display = 'flex';
        document.getElementById('main').style.display = 'none';
        document.getElementById('master').style.filter = 'blur(5px)';
        document.getElementById('master').style.pointerEvents = 'none';
        document.getElementById('activeUser').textContent = 'No user';
        document.getElementById('turnstile1').className = 'cf-turnstile';
        document.getElementById('turnstile2').className = 'cf-turnstile';
    } else {
        window.location.href = '/nihongo/';
    }
}

// Prevent multiple simultaneous checks
let isAuthCheckInProgress = false;

// Debounce timer to limit frequent calls
let authCheckTimeout;

// Main authentication check function
async function checkAuthentication(retries = 3) {
    if (isAuthCheckInProgress) return; // Prevent multiple checks
    isAuthCheckInProgress = true;

    const token = getJWTToken();

    if (!token || isTokenExpired(token)) {
        console.log('Authentication failed: Token expired or missing');
        logout();
        isAuthCheckInProgress = false;
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/validate-token`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.status === 403) {
            console.log('Token is blacklisted');
            logout();
            isAuthCheckInProgress = false;
            return;
        }

        const result = await response.json();

        if (!response.ok || !result.userId) {
            throw new Error('Invalid token');
        }

        console.log('User is authenticated:', result.userId);

        if (window.location.pathname === '/nihongo/') {
            document.getElementById('main').style.display = 'flex';
            document.getElementById('master').style.filter = 'none';
            document.getElementById('master').style.pointerEvents = '';
        }
    } catch (error) {
        console.error('Authentication failed:', error);

        if (retries > 0) {
            console.log(`Retrying authentication (${retries} retries left)...`);
            setTimeout(() => checkAuthentication(retries - 1), 1000);
        } else {
            logout();
        }
    } finally {
        isAuthCheckInProgress = false;
    }
}

// Debounce the authentication check to prevent rapid calls
function debounceCheckAuthentication(delay = 500) {
    clearTimeout(authCheckTimeout);
    authCheckTimeout = setTimeout(() => {
        checkAuthentication();
    }, delay);
}

// Call this function when the page loads to ensure authentication status is checked
document.addEventListener('DOMContentLoaded', () => debounceCheckAuthentication());