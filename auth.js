// constants in config.js
/**
 * Get JWT token from local storage
 * @returns {string|null} JWT token
 */
function getJWTToken() {
    return localStorage.getItem('jwt');
}

/**
 * Decode a JWT token
 * @param {string} token JWT token
 * @returns {object|null} Decoded token payload
 */
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

/**
 * Check if JWT token is expired
 * @param {string} token JWT token
 * @returns {boolean} True if token is expired, false otherwise
 */
function isTokenExpired(token) {
    try {
        const { exp } = decodeJWT(token);
        return Date.now() >= exp * 1000;
    } catch (error) {
        return true; // Assume expired if decoding fails
    }
}

/**
 * Redirect user if not authenticated and show unauthenticated page
 */
async function checkAuthentication() {
    const token = getJWTToken();

    // Check if the token is missing or expired
    if (!token || isTokenExpired(token)) {
        console.log('Authentication failed: User not authenticated');
        window.location.href = '/nihongo/unauthorized.html'; // Redirect to unauthorized page
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/validate-token`, {
            method: 'GET',  // Change from POST to GET as per backend endpoint
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const result = await response.json();
        if (response.status !== 200 || !result.userId) {
            throw new Error('Invalid token');
        }
        console.log('User is authenticated', result.userId);
    } catch (error) {
        console.error('Authentication failed:', error);
        window.location.href = '/nihongo/unauthorized.html'; // Redirect to unauthorized page
    }
}

/**
 * Logout user and redirect
 */
function logout() {
    localStorage.removeItem('jwt');
    alert('You have been logged out');
    window.location.href = '/nihongo/index.html'; // Redirect to login page
}

// Call this function when the page loads to ensure authentication status is checked
document.addEventListener('DOMContentLoaded', checkAuthentication);