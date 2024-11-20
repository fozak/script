async function callOpenAI(prompt) {
    // Get API key and model from local storage
    const apiKey = localStorage.getItem('openai_api_key');
    const model = localStorage.getItem('openai_model');
    
    if (!apiKey || !model) {
        alert("API key and model must be set before making requests.");
        return;
    }

    const url = 'https://api.openai.com/v1/chat/completions'; // Change the endpoint as needed

    // Prepare the request body
    const requestBody = {
        model: model, // Use the model from local storage
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100, // Adjust based on your needs
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`, // Use Bearer token authentication
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content; // Access the generated response
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        return "Sorry, I couldn't get a response.";
    }
}

// Function to prompt for API key and model
function setApiKeyAndModel() {
    const apiKey = prompt("Please enter your OpenAI API Key:");
    const model = prompt("Please enter the model you want to use (e.g., gpt-4):");

    if (apiKey && model) {
        localStorage.setItem('openai_api_key', apiKey);
        localStorage.setItem('openai_model', model);
        alert("API Key and model have been saved!");
    } else {
        alert("Both API Key and model are required!");
        setApiKeyAndModel(); // Prompt again if values are missing
    }
}

// Check for existing API key and model in local storage
if (!localStorage.getItem('openai_api_key') || !localStorage.getItem('openai_model')) {
    setApiKeyAndModel();
}

document.getElementById('send-button').addEventListener('click', async () => {
    const userInput = document.getElementById('user-input');
    const userMessage = userInput.value;

    if (userMessage.trim() === '') return; // Prevent sending empty messages

    // Display user message
    const chatBox = document.getElementById('chat-box');
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'user-message';
    userMessageDiv.innerText = userMessage;
    chatBox.appendChild(userMessageDiv);

    // Clear input field
    userInput.value = '';

    // Call OpenAI API
    const aiResponse = await callOpenAI(userMessage);

    // Display AI response
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'ai-message';
    aiMessageDiv.innerText = aiResponse;
    chatBox.appendChild(aiMessageDiv);

    // Scroll to the bottom of the chat box
    chatBox.scrollTop = chatBox.scrollHeight;
});