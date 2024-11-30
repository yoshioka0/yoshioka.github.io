// Constants in config.js

const TOKEN = localStorage.getItem('jwt'); // JWT Token stored in localStorage

// Check if token is available, if not redirect to login page
if (!TOKEN) {
    window.location.href = '/nihongo/unauthorized.html'; // Redirect to login page
}

async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        logMessage('Fetch error: ' + error, 'error');
        throw error; // Rethrow the error for further handling
    }
}

// Tab switching logic
const tabs = document.querySelectorAll('.tab-button');
const contents = document.querySelectorAll('.tab-content');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Fetch users
async function fetchUsers() {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '<tr><td colspan="4">Loading...</td></tr>'; // Show loading state
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        if (!response.ok) {
            const error = await response.json();
            logMessage(error.error || 'Failed to fetch users', 'error');
            return;
        }

        const users = await response.json();
        userList.innerHTML = users.map(user => `
            <tr>
                <td>${user._id}</td>
                <td>${user.username}</td>
                <td>${user.currentIP || 'N/A'}</td>
                <td>${user.role || 'user'}</td>
                <td>
                    <button onclick="deleteUser('${user._id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        logMessage('Error loading users: ' + err, 'error');
        userList.innerHTML = '<tr><td colspan="4">Error loading users</td></tr>';
    }
}

// Delete User
async function deleteUser(userId) {
    if (!confirm('Are you sure?')) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${TOKEN}` },
        });

        if (response.status === 401) {
            // Handle case where the token is blacklisted or invalid
            logMessage('Your session has expired. Please log in again.', 'error');
            logoutUser();  // Add a function to log out the user (clear the token)
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            logMessage(error.error || 'Failed to delete user', 'error');
            return;
        }

        logMessage('User deleted successfully', 'success');
        fetchUsers(); // Refresh the user list after deletion
    } catch (err) {
        logMessage('Error deleting user: ' + err, 'error');
    }
}

// Log out the user (clear token)
function logoutUser() {
    localStorage.removeItem('jwt');
    window.location.href = '/login'; // Redirect to login page or home
}


// Fetch all subscriptions (push notifications)
async function fetchSubscriptions() {
    const subscriptionList = document.getElementById('subscription-list');
    subscriptionList.innerHTML = '<tr><td colspan="3">Loading...</td></tr>'; // Show loading state
    try {
        const response = await fetch(`${API_URL}/admin/subscriptions`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        if (!response.ok) {
            const error = await response.json();
            logMessage(error.error || 'Failed to fetch subscriptions', 'error');
            return;
        }

        const subscriptions = await response.json();
        subscriptionList.innerHTML = subscriptions.map(sub => `
            <tr>
                <td>${sub.userId}</td>
                <td>${sub.endpoint}</td>
                <td>
                    <button onclick="deleteSubscription('${sub._id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        logMessage('Error loading subscriptions: ' + err, 'error');
        subscriptionList.innerHTML = '<tr><td colspan="3">Error loading subscriptions</td></tr>';
    }
}

// Delete subscription
async function deleteSubscription(subscriptionId) {
    if (!confirm('Are you sure?')) return;
    try {
        const response = await fetch(`${API_URL}/admin/subscriptions/${subscriptionId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        if (!response.ok) {
            const error = await response.json();
            logMessage(error.error || 'Failed to delete subscription', 'error');
            return;
        }

        logMessage('Subscription deleted', 'success');
        fetchSubscriptions();
    } catch (err) {
        logMessage('Error deleting subscription: ' + err, 'error');
    }
}

// Send notification
document.getElementById('notification-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const message = document.getElementById('message').value;
    const icon = document.getElementById('icon').value || null;
    const image = document.getElementById('image').value || null;
    const username = document.getElementById('username').value || null;

    try {
        const response = await fetch(`${API_URL}/admin/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ title, message, icon, image, username })
        });

        if (!response.ok) {
            const error = await response.json();
            logMessage(error.error || 'Failed to send notification', 'error');
            return;
        }

        logMessage('Notification sent', 'success');
    } catch (err) {
        logMessage('Error sending notification: ' + err, 'error');
    }
});

// Fetch and display notifications
async function fetchNotifications() {
    const notificationList = document.getElementById('notification-list');
    
    // Ensure the parent container is using Flexbox
	notificationList.style.display = 'flex'; // Add this to explicitly set the display type.
	notificationList.style.flexWrap = 'wrap'; // Allow wrapping of the cards to the next row
	notificationList.style.gap = '0px'; // Space between cards
	notificationList.style.justifyContent = 'center'; // Center horizontally
//	notificationList.style.alignItems = 'center'; // Center vertically
	
	notificationList.innerHTML = '<p>Loading...</p>'; // Show loading state

    try {
        const response = await fetch(`${API_URL}/admin/notifications`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        if (!response.ok) {
            const error = await response.json();
            logMessage(error.error || 'Failed to fetch notifications', 'error');
            return;
        }

        const notifications = await response.json();
        notificationList.innerHTML = notifications.map(notification => {
            const backgroundStyle = notification.image
                ? `background-image: url('${notification.image}');`
                : `background: linear-gradient(45deg, #ff7e5f, #feb47b);`; // Default gradient
            return `
                <div class="notification-card" style="${backgroundStyle}">
                    <div class="notification-header">
                        <h3>${notification.title}</h3>
                        <span class="notification-date">${new Date(notification.sentAt).toLocaleString()}</span>
                    </div>
                    <div class="notification-body">
                        <p>${notification.message}</p>
                    </div>
                    <div class="notification-footer">
                        ${notification.icon ? `<img src="${notification.icon}" alt="Icon" class="notification-icon">` : ''}
                        <div class="notification-sender">
                            <strong>To:</strong> ${notification.username || 'Unknown'}
                        </div>
                        <div class="notification-status">
                              <strong>Status:</strong> ${notification.status}
                            ${notification.failurereason ? `<span>Failure Reason: ${notification.failurereason}</span>` : ''}
                        </div>
                        <button onclick="deleteNotification('${notification._id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        logMessage('Error loading notifications: ' + err, 'error');
        notificationList.innerHTML = '<p>Error loading notifications</p>';
    }
}
// Delete notification
async function deleteNotification(notificationId) {
    if (!confirm('Are you sure?')) return;
    try {
        const response = await fetch(`${API_URL}/admin/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        if (!response.ok) {
            const error = await response.json();
            logMessage(error.error || 'Failed to delete notification', 'error');
            return;
        }

        logMessage('Notification deleted', 'success');
        fetchNotifications();
    } catch (err) {
        logMessage('Error deleting notification: ' + err, 'error');
    }
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
    fetchSubscriptions(); // Fetch subscriptions on page load
    fetchNotifications(); // Fetch notifications on page load
});

// Function to log messages to the console div
function logMessage(message, type = 'log') {
    const consoleDiv = document.getElementById('console');
    const logEntry = document.createElement('div');
    logEntry.className = `log ${type}`;
    logEntry.textContent = message;
    consoleDiv.appendChild(logEntry);
    consoleDiv.scrollTop = consoleDiv.scrollHeight; // Auto-scroll to the bottom
}