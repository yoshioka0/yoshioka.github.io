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
  new Audio('/nihongo/jingle.mp3').play();

});