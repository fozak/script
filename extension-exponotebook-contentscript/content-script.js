let conversationHistory = [];

// Create UI elements
const container = document.createElement('div');
container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    height: 600px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    z-index: 10000;
`;

const chatBox = document.createElement('div');
chatBox.id = 'chat-box';
chatBox.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    background: #f9f9f9;
`;

const inputContainer = document.createElement('div');
inputContainer.style.cssText = `
    display: flex;
    padding: 10px;
    border-top: 1px solid #eee;
`;

const input = document.createElement('input');
input.id = 'user-input';
input.style.cssText = `
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-right: 8px;
`;

const sendButton = document.createElement('button');
sendButton.id = 'send-button';
sendButton.textContent = 'Send';
sendButton.style.cssText = `
    padding: 8px 16px;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
`;

// Assemble UI
inputContainer.appendChild(input);
inputContainer.appendChild(sendButton);
container.appendChild(chatBox);
container.appendChild(inputContainer);
document.body.appendChild(container);

// Function to execute code in main document context
function executeInMainContext(code) {
    return new Promise((resolve) => {
        // Store original console.log
        const originalConsoleLog = console.log;
        let output = '';
        
        // Override console.log to capture output
        console.log = (...args) => {
            output += args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ') + '\n';
            originalConsoleLog.apply(console, args);
        };

        try {
            const script = document.createElement('script');
            script.textContent = code;
            document.body.appendChild(script);
            document.body.removeChild(script);

            // Restore console.log
            console.log = originalConsoleLog;
            resolve(output || 'Code executed successfully (no output)');
        } catch (error) {
            console.log = originalConsoleLog;
            resolve('Error: ' + error.message);
        }
    });
}

// Handle code execution
async function handleCodeExecution(code, outputElement) {
    outputElement.style.display = 'block';
    outputElement.textContent = 'Executing...';
    
    try {
        const result = await executeInMainContext(code);
        outputElement.textContent = result;
    } catch (error) {
        outputElement.textContent = 'Error: ' + error.message;
    }
}

// OpenAI API call function
async function callOpenAI(prompt) {
    const storage = await chrome.storage.local.get(['openai_api_key', 'openai_model']);
    
    if (!storage.openai_api_key || !storage.openai_model) {
        await setApiKeyAndModel();
        return;
    }

    const messages = [
        ...conversationHistory.slice(-4),
        { role: 'user', content: prompt }
    ];

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${storage.openai_api_key}`,
            },
            body: JSON.stringify({
                model: storage.openai_model,
                messages: messages,
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const assistantResponse = data.choices[0].message.content;
        
        conversationHistory.push(
            { role: 'user', content: prompt },
            { role: 'assistant', content: assistantResponse }
        );
        
        if (conversationHistory.length > 10) {
            conversationHistory = conversationHistory.slice(-10);
        }

        return assistantResponse;
    } catch (error) {
        console.error('Error:', error);
        return "Sorry, I couldn't get a response. Error: " + error.message;
    }
}

// Settings function
async function setApiKeyAndModel() {
    const apiKey = prompt("Please enter your OpenAI API Key:");
    const model = prompt("Please enter the model you want to use (e.g., gpt-4):");

    if (apiKey && model) {
        await chrome.storage.local.set({
            openai_api_key: apiKey,
            openai_model: model
        });
        return true;
    }
    return false;
}

// Initialize
(async () => {
    const storage = await chrome.storage.local.get(['openai_api_key', 'openai_model']);
    if (!storage.openai_api_key || !storage.openai_model) {
        await setApiKeyAndModel();
    }

    // Event listener for code execution buttons
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('run-button')) {
            const codeId = e.target.getAttribute('data-code-id');
            const codeElement = document.querySelector(`code[data-code-id="${codeId}"]`);
            const outputElement = document.getElementById(codeId);
            
            if (codeElement && outputElement) {
                await handleCodeExecution(codeElement.textContent, outputElement);
            }
        }
    });

    // Event listener for send button
    sendButton.addEventListener('click', async () => {
        const userMessage = input.value.trim();
        if (!userMessage) return;

        chatBox.innerHTML += `
            <div class="message user-message">${userMessage}</div>
            <div class="separator"></div>
        `;
        
        input.value = '';
        
        const aiResponse = await callOpenAI(userMessage);
        chatBox.innerHTML += `
            <div class="message ai-message">${marked.parse(aiResponse)}</div>
            <div class="separator"></div>
        `;
        
        chatBox.scrollTop = chatBox.scrollHeight;
    });
})();
