let conversationHistory = [];

const renderer = new marked.Renderer();
renderer.code = function(code, language) {
    const id = 'code-' + Math.random().toString(36).substr(2, 9);
    return `
        <div class="code-container">
            <pre><code class="language-${language}" data-code-id="${id}">${code}</code></pre>
            <button class="run-button" data-code-id="${id}">Run Code</button>
            <div id="${id}" class="code-output"></div>
        </div>
    `;
};

marked.setOptions({ renderer });

async function executeInTab(code) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (code) => {
                const logs = []; // Array to capture console logs

                // Override console.log to push messages to the logs array
                const originalConsoleLog = console.log;
                console.log = (...args) => {
                    logs.push(args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
                    originalConsoleLog(...args); // Call the original console.log
                };

                // Function to send logs back to the extension
                const sendLogs = () => {
                    chrome.runtime.sendMessage({ logs });
                };

                // Execute the provided code
                const script = document.createElement('script');
                script.textContent = code; // Set the code as text content
                document.body.appendChild(script); // Append to the body
                document.body.removeChild(script); // Remove it after execution

                // Send logs after execution
                sendLogs();
            },
            args: [code] // Pass the code as argument
        });

        return { success: true }; // Return results
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Event listener for code execution
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('run-button')) {
        const codeId = e.target.getAttribute('data-code-id');
        const codeElement = document.querySelector(`code[data-code-id="${codeId}"]`);
        const outputElement = document.getElementById(codeId);
        
        if (codeElement && outputElement) {
            const code = codeElement.textContent;
            outputElement.style.display = 'block';
            outputElement.textContent = 'Executing...';
            
            const result = await executeInTab(code);
            if (result.success) {
                outputElement.textContent += '\nCode executed successfully.'; // Indicate successful execution
            } else {
                outputElement.textContent = 'Error: ' + result.error; // Show error if any
            }
        }
    }
});

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

// Initialize the extension
document.addEventListener('DOMContentLoaded', async () => {
    const storage = await chrome.storage.local.get(['openai_api_key', 'openai_model']);
    if (!storage.openai_api_key || !storage.openai_model) {
        await setApiKeyAndModel();
    }

    document.getElementById('send-button').addEventListener('click', async () => {
        const userInput = document.getElementById('user-input');
        const userMessage = userInput.value.trim();
        
        if (!userMessage) return;

        const chatBox = document.getElementById('chat-box');
        
        // Add user message
        chatBox.innerHTML += `
            <div class="message user-message">${userMessage}</div>
            <div class="separator"></div>
        `;
        
        userInput.value = '';
        
        // Get and add AI response
        const aiResponse = await callOpenAI(userMessage);
        chatBox.innerHTML += `
            <div class="message ai-message">${marked.parse(aiResponse)}</div>
            <div class="separator"></div>
        `;
        
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    // Listener for console logs from the injected script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.logs && Array.isArray(message.logs) && message.logs.length > 0) {
            const logOutput = document.getElementById(message.logs[0].id); // Get the corresponding output element
            if (logOutput) {
                logOutput.innerHTML += message.logs.join('<br>'); // Append logs to the output
                logOutput.scrollTop = logOutput.scrollHeight; // Scroll to the bottom
            }
        }
    });
});