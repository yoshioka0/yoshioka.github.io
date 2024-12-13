// constants in config.js

function getJWTToken() {
    return localStorage.getItem('jwt');
}
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
	        console.log('Authentication failed: Token expired or missing');
	        logout();
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
			}
		
	    const result = await response.json();
	
	    if (!response.ok || !result.userId) {
	        throw new Error('Invalid token');
	    }
	
	    console.log('User is authenticated', result.userId);
	
	    if (window.location.pathname === '/nihongo/') {
	        document.getElementById('main').style.display = 'flex';
	        document.getElementById('master').style.filter = 'none';
	        document.getElementById('master').style.pointerEvents = '';
			
	    }
	} catch (error) {
	    console.error('Authentication failed:', error);
	    logout();
	}
}

// Logout user and redirect
function logout() { 
    localStorage.removeItem('jwt');
    // Handle UI change for logged-out users
    if (window.location.pathname === '/nihongo/') {
        document.getElementById('signup-modal').style.display = 'flex';
        document.getElementById('main').style.display = 'none';
        document.getElementById('master').style.filter = 'blur(5px)';
        document.getElementById('master').style.pointerEvents = 'none';
        document.getElementById('activeUser').textContent = 'No user';  
//       document.getElementById('turnstile1').className = 'cf-turnstile';
//       document.getElementById('turnstile2').className = 'cf-turnstile';
    } else {
        window.location.href = '/nihongo/';
    }
}

// Call this function when the page loads to ensure authentication status is checked
document.addEventListener('DOMContentLoaded', checkAuthentication);