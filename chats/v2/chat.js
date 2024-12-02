// Chat Frontend Script (chat.js)

// Connect to the server using Socket.io
const socket = io('http://localhost:3000', {
    query: { token: localStorage.getItem('jwt') }
});

// DOM Elements
const chatList = document.getElementById('chat-list'); // Left panel: list of users/chatrooms
const chatWindow = document.getElementById('chat-window'); // Right panel: chat messages
const messageInput = document.getElementById('message-input'); // Message input box
const sendButton = document.getElementById('send-button'); // Send button
const logoutButton = document.getElementById('logoutBtn'); // Logout button
const blockButton = document.getElementById('block-button'); // Block button (to be added in the HTML)

// Decode JWT to get user details
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
        return null;
    }
}

// Get user details from JWT
const jwt = localStorage.getItem('jwt');
if (!jwt) {
    alert('Authentication token not found. Please log in again.');
    window.location.href = '/'; // Redirect to login if token is missing
}

const decoded = decodeJWT(jwt);
const senderUserId = decoded.userId; // Sender's userId (from JWT)
const senderUsername = decoded.username;

// Set the username in the UI
document.getElementById('myUsername').textContent = senderUsername;

// Global Variable for recipient's user ID
let currentChatUserId = null; // Tracks the currently selected recipient user

// Helper Function: Fetch API Wrapper
async function fetchAPI(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
    };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`http://localhost:3000${endpoint}`, options); // Added full URL
    if (!response.ok) throw new Error(await response.text());
    return response.json();
}


// 1. Load User List (Left Panel) with Search and Always Show Chatted Users
async function loadChatList(searchQuery = '') {
    try {
        chatList.innerHTML = ''; // Clear previous list

        // Fetch previously chatted users (from localStorage)
        const chattedUsers = JSON.parse(localStorage.getItem('chattedUsers')) || [];

        // Fetch all users from the server, only send search query if it's valid (>= 4 chars)
        const url = searchQuery.length >= 4 ? `/api/users?username=${searchQuery}` : '/api/users';
        const allUsers = await fetchAPI(url);

        // Initialize arrays for users to display
        const usersToDisplay = [];

        // If no search query, only show chatted users
        if (searchQuery.length === 0) {
            // Filter out users who have already been chatted with
            allUsers.forEach((user) => {
                if (chattedUsers.includes(user.username)) {
                    usersToDisplay.push(user);  // Already chatted users will be prioritized
                }
            });
        } else {
            // If there's a search query, show users based on the query
            const nonChattedUsers = [];

            allUsers.forEach((user) => {
                if (chattedUsers.includes(user.username)) {
                    usersToDisplay.push(user);  // Already chatted users will be prioritized
                } else {
                    nonChattedUsers.push(user);  // Non-chatted users will be added based on query
                }
            });

            // Show only non-chatted users that match the search query
            usersToDisplay.push(...nonChattedUsers);
        }

        // If no users found
        if (usersToDisplay.length === 0) {
            chatList.innerHTML = '<p>No users found.</p>';
        } else {
            // Display users
            usersToDisplay.forEach((user) => {
                const userItem = document.createElement('div');
                userItem.textContent = user.username;  // Display username
                userItem.classList.add('user-item');
                userItem.dataset.userId = user._id;

                // Add event listener to open the chat with the selected user
                userItem.addEventListener('click', () => openChat(user._id, user.username));

                chatList.appendChild(userItem);
            });
        }

    } catch (error) {
        console.error('Error loading chat list:', error.message);
    }
}

// Event listener for search input
document.getElementById('search-users').addEventListener('input', (e) => {
    const searchQuery = e.target.value.trim();
    loadChatList(searchQuery);  // Reload user list with the search query
});



// 2. Open Chat with a User
// Open Chat with a User
async function openChat(recipientUserId, recipientUsername) {
    currentChatUserId = recipientUserId;
    currentChatUsername = recipientUsername;
    chatWindow.innerHTML = `<h3>Chat with ${recipientUsername}</h3>`;
    
    // Join the chat room when the user opens the chat window
    socket.emit('join', { senderUserId, recipientUserId }); // Send both user IDs to the server

    try {
        const messages = await fetchAPI(`/chats/${senderUserId}/${recipientUserId}`);
        if (messages.length === 0) {
            chatWindow.innerHTML += '<p>No messages yet.</p>';
        }
        messages.forEach((message) => displayMessage(message, message.sender === senderUserId));

        // Mark messages as read after loading
        markMessagesAsRead();  // Ensure this is called to mark messages as read

    } catch (error) {
        console.error('Error loading chat messages:', error.message);
        chatWindow.innerHTML += '<p>Error loading messages. Please try again later.</p>';
    }

    // Show block button if user is not the current user
    if (senderUserId !== recipientUserId) {
        blockButton.style.display = 'inline-block';
        blockButton.onclick = () => blockUser(); // Block button action
    } else {
        blockButton.style.display = 'none';
    }
}

// 3. Display Messages
function displayMessage(message, isSelf) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isSelf ? 'self' : 'other');

    // Create the message text element
    const messageText = document.createElement('p');
    messageText.textContent = message.message;

    // Create the timestamp element
    const formattedTime = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestamp = document.createElement('span');
    timestamp.classList.add('timestamp');
    timestamp.textContent = formattedTime;

    // Append message text and timestamp to the message div
    messageDiv.appendChild(messageText);
    messageDiv.appendChild(timestamp);

    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 4. Send a Message
async function sendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText || !currentChatUserId) return;

    const message = {
        sender: senderUserId,             // sender is extracted from the JWT
        receiver: currentChatUserId,      // receiver is the selected user
        message: messageText,             // message is the content typed by the user
    };

    try {
        // Emit the message to the backend via socket
        socket.emit('sendMessage', message);
        
        // Clear the input field
        messageInput.value = '';

 // Update localStorage with the new chatted user
const chattedUsers = JSON.parse(localStorage.getItem('chattedUsers')) || [];

// Add the current chat user if their username is not already in the list
if (!chattedUsers.includes(currentChatUsername)) {  // Use the username instead of userId
    chattedUsers.push(currentChatUsername);  // Push the username
    localStorage.setItem('chattedUsers', JSON.stringify(chattedUsers));
}

    } catch (error) {
        console.error('Error sending message:', error.message);
    }
}

// 5. Receive Messages via WebSocket
socket.on('receiveMessage', (message) => {
    // Check if the message is relevant to the current chat (either sent or received by the user)
    if (message.receiver === senderUserId || message.sender === senderUserId) {
        displayMessage(message, message.sender === senderUserId); // Display as 'self' if the user is the sender
    }
});

// ### Notify for message
function displayNotification(message) {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = message;
    document.body.appendChild(notification);
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000); // Hide after 5 seconds
}

// 6. Handle Typing Indicator (Optional)
let typingTimeout;
messageInput.addEventListener('input', () => {
    if (currentChatUserId) {
        socket.emit('typing', { senderId: senderUserId, receiverId: currentChatUserId });
    }
    clearTimeout(typingTimeout); // Reset typing timeout
    typingTimeout = setTimeout(() => {
        // Hide typing indicator if no more typing happens after 3 seconds
        let typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) typingIndicator.remove();
    }, 3000);
});

// 7. Typing Indicator Display (Optional)
socket.on('typing', ({ senderId }) => {
    if (senderId !== senderUserId && currentChatUserId === senderUserId) {
        // Create or update the typing indicator
        let typingIndicator = document.querySelector('.typing-indicator');
        if (!typingIndicator) {
            typingIndicator = document.createElement('div');
            typingIndicator.classList.add('typing-indicator');
            chatWindow.appendChild(typingIndicator);
        }
        typingIndicator.textContent = 'User is typing...';
    }
});

// 8. Block User
async function blockUser(recipientUserId) {
    try {
        const response = await fetchAPI(`/chats/block/${senderUserId}/${recipientUserId}`, 'POST');
        if (response.success) {
            alert('User has been blocked.');
            // Optionally remove the user from the chat list or close the chat
            chatWindow.innerHTML = '<p>You have blocked this user.</p>';
            blockButton.style.display = 'none';
        } else {
            alert('Error blocking user.');
        }
    } catch (error) {
        console.error('Error blocking user:', error.message);
    }
}

// 9. Availability 
socket.on('userOffline', (userId) => {
    const userElement = document.querySelector(`[data-user-id='${userId}']`);
    if (userElement) {
        userElement.classList.add('offline');
    }
});

//10. Read Status 
// Function to mark messages as read
async function markMessagesAsRead(senderId, receiverId) {
    try {
        const response = await fetch('/chats/mark-read', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Add your JWT token here
            },
            body: JSON.stringify({
                senderId: senderId,
                receiverId: receiverId,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Messages marked as read:', data.updatedMessages);
            // Update UI: mark messages as read
            updateMessageStatusToRead(senderId, receiverId); // Implement this function to update message status in the UI
        } else {
            console.error('Failed to mark messages as read:', data.error);
        }
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

// Function to update the message status in the UI
function updateMessageStatusToRead(senderId, receiverId) {
    // Loop through the chat messages in the UI and update those sent by senderId to receiverId as read
    const messageElements = document.querySelectorAll('.message');
    messageElements.forEach((messageElement) => {
        const messageSenderId = messageElement.dataset.senderId;
        const messageReceiverId = messageElement.dataset.receiverId;

        if (messageSenderId === senderId && messageReceiverId === receiverId) {
            messageElement.classList.add('read'); // Mark message as read visually (e.g., add 'read' class)
        }
    });
}


// Event Listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Initialize Chat
loadChatList();