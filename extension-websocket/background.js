//background.js

// Function to establish a WebSocket connection
// Declare ws in the broader scope
let ws;

// Function to establish a WebSocket connection
function establishConnection() {
  ws = new WebSocket('ws://localhost:8081');

  // Event handler for when the connection is opened
  ws.onopen = function() {
    console.log('Connected to Node.js server');

    // Send a message to the server
    sendMessage('Hello from Chrome extension!');
  };

  // Function to send messages to the server
  function sendMessage(message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message); // Send the message only if the connection is open
      console.log('Message sent to server:', message);
    } else {
      console.error('WebSocket is not open. Cannot send message.');
    }
  }

  // Event handler for receiving messages from the server
  ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('Received from server:', message);
  };

  // Error handling
  ws.onerror = function(error) {
    console.error('WebSocket error:', error);
  };

  // Event handler for when the connection is closed
  ws.onclose = function() {
    console.log('Disconnected from server');
  };
}

// Reinstantiate the WebSocket connection every 10 seconds
setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close(); // Close the existing connection if it's open
  }
  establishConnection(); // Establish a new connection
}, 10000); // 10000 milliseconds = 10 seconds