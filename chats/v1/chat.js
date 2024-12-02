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
const logoutButton = document.getElementById('logout-button'); // Logout button

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
        return null;  // Return null or handle it as needed
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

// 1. Load User List (Left Panel)
async function loadChatList() {
    try {
        const users = await fetchAPI('/api/users');
        chatList.innerHTML = '';
        users.forEach((user) => {
            const userItem = document.createElement('div');
            userItem.textContent = user.username;
            userItem.classList.add('user-item');
            userItem.dataset.userId = user._id;

            userItem.addEventListener('click', () => openChat(user._id, user.username));
            chatList.appendChild(userItem);
        });
    } catch (error) {
        console.error('Error loading chat list:', error.message);
    }
}

// 2. Open Chat with a User
async function openChat(recipientUserId, recipientUsername) {
    currentChatUserId = recipientUserId;
    chatWindow.innerHTML = `<h3>Chat with ${recipientUsername}</h3>`;
    
    // Join the chat room when the user opens the chat window
    socket.emit('join', { senderUserId, recipientUserId });  // Send both user IDs to the server
    
    try {
        const messages = await fetchAPI(`/chats/${senderUserId}/${recipientUserId}`);
        if (messages.length === 0) {
            chatWindow.innerHTML += '<p>No messages yet.</p>';
        }
        messages.forEach((message) => displayMessage(message, message.sender === senderUserId));
    } catch (error) {
        console.error('Error loading chat messages:', error.message);
        chatWindow.innerHTML += '<p>Error loading messages. Please try again later.</p>';
    }
}


// 3. Display Messages
function displayMessage(message, isSelf) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isSelf ? 'self' : 'other');
    const formattedTime = new Date(message.timestamp).toLocaleTimeString();
    messageDiv.textContent = `${formattedTime} - ${message.message}`;
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

// 8. Logout
// logoutButton.addEventListener('click', () => {
 //   localStorage.removeItem('jwt');
//    window.location.href = '/'; // Redirect to the login page
//   });

// Event Listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Initialize Chat
loadChatList();