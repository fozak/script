//WebSocket Communication Example

// SERVER (Node.js) - server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', function connection(ws) {
  console.log('New client connected');
  
  // Handle incoming messages from extension
  ws.on('message', function incoming(message) {
    console.log('Received from extension:', message.toString());
    
    // Send response back to extension
    ws.send(JSON.stringify({
      type: 'response',
      content: 'Server received: ' + message.toString()
    }));
  });

  // Handle client disconnection
  ws.on('close', function close() {
    console.log('Client disconnected');
  });
});