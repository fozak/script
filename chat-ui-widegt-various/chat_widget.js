(function() {
    // Create a style element to hold the CSS
    const style = document.createElement('style');
    style.textContent = `
        .chat-container {
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            width: 100%; /* Full width of the container */
            display: flex;
            flex-direction: column;
            padding: 20px;
            height: 100%; /* Full height of the viewport */
        }
        .chat-box {
            flex: 1;
            overflow-y: auto;
            max-height: 400px;
            margin-bottom: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        .message {
            margin: 5px 0;
            padding: 10px;
            border-radius: 5px;
            max-width: 80%;
            word-wrap: break-word;
        }
        .user-message {
            background-color: #cce5ff;
            align-self: flex-end;
        }
        .bot-message {
            background-color: #e2e3e5;
            align-self: flex-start;
        }
        textarea {
            width: 100%;
            resize: none;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            margin-bottom: 10px;
            font-size: 14px;
        }
        button {
            padding: 10px;
            border: none;
            border-radius: 5px;
            background-color: #007bff;
            color: white;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover {
            background-color: #0056b3;
        }
    `;
    document.head.appendChild(style); // Append the styles to the document head

    // Create the chat container
    const chatContainer = document.createElement('div');
    chatContainer.classList.add('chat-container');

    // Create the chat box
    const chatBox = document.createElement('div');
    chatBox.classList.add('chat-box');
    chatContainer.appendChild(chatBox);

    // Create the textarea for user input
    const inputField = document.createElement('textarea');
    inputField.placeholder = 'Type your message...';
    chatContainer.appendChild(inputField);

    // Create the send button
    const sendButton = document.createElement('button');
    sendButton.innerText = 'Send';
    chatContainer.appendChild(sendButton);

    // Add event listeners for sending messages
    sendButton.addEventListener('click', sendMessage);
    inputField.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Append the chat container to the specified div
    document.getElementById('chat-widget-container').appendChild(chatContainer);

    function sendMessage() {
        const messageText = inputField.value.trim();
        
        if (messageText === '') return;

        // Append user message
        appendMessage(messageText, 'user-message');

        // Clear input field
        inputField.value = '';

        // Simulate a response from the bot after a short delay
        setTimeout(() => {
            const botResponse = getBotResponse(messageText);
            appendMessage(botResponse, 'bot-message');
        }, 1000);
    }

    function appendMessage(text, className) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', className);
        messageDiv.innerText = text;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
    }

    function getBotResponse(userMessage) {
        // Here you can implement your logic for generating bot responses
        return `You said: "${userMessage}"`;
    }
})();