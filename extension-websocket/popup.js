// Get the button and input field
const sendButton = document.getElementById('sendButton');
const messageInput = document.getElementById('messageInput');

// Establish WebSocket connection (ensure this matches your background script)
const ws = new WebSocket('ws://localhost:8081');

// Event handler for button click
sendButton.addEventListener('click', function() {
  const message = messageInput.value; // Get the input value
  if (message) {
    // Send the message to the server
    sendMessage(message);
    messageInput.value = ''; // Clear the input field
  } else {
    console.error('Message cannot be empty.');
  }
});

// Function to send messages
function sendMessage(message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    console.log('Message sent to server:', message);
  } else {
    console.error('WebSocket is not open. Cannot send message.');
  }
}