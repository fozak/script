document.addEventListener('DOMContentLoaded', function() {
    // Initialize marked renderer
    const renderer = new marked.Renderer();
    renderer.code = function(code, language) {
        const id = 'code-' + Math.random().toString(36).substr(2, 9);
        return `
            <div class="code-container">
                <pre><code class="language-${language}">${code}</code></pre>
                <button class="run-button" onclick="executeCodeFromButton('${id}', this)">Run Code</button>
                <div id="${id}" class="code-output"></div>
            </div>
        `;
    };
    marked.setOptions({ renderer });

    // Console handling
    const originalConsole = { log: console.log, error: console.error };
    let currentOutputElement = null;
    const customConsole = {
        log: (...args) => {
            if (currentOutputElement) {
                currentOutputElement.textContent += args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ') + '\n';
            }
        },
        error: (...args) => {
            if (currentOutputElement) {
                currentOutputElement.textContent += 'Error: ' + args.join(' ') + '\n';
            }
        }
    };

    let conversationHistory = [];

    // Event listeners setup
    document.getElementById('send-button').addEventListener('click', handleSendMessage);
    document.getElementById('user-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    document.getElementById('settings-button').addEventListener('click', setApiKeyAndModel);

    // Check for API key on load
    if (!localStorage.getItem('openai_api_key') || !localStorage.getItem('openai_model')) {
        setApiKeyAndModel();
    }

    async function handleSendMessage() {
        const userInput = document.getElementById('user-input');
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        appendMessage('user', userMessage);
        userInput.value = '';

        const aiResponse = await callOpenAI(userMessage);
        appendMessage('ai', aiResponse, true);
    }

    function appendMessage(type, content, parseMarkdown = false) {
        const chatBox = document.getElementById('chat-box');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        if (parseMarkdown) {
            messageDiv.innerHTML = marked.parse(content);
        } else {
            messageDiv.textContent = content;
        }
        
        chatBox.appendChild(messageDiv);
        chatBox.appendChild(document.createElement('div')).className = 'separator';
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function callOpenAI(prompt) {
        const apiKey = localStorage.getItem('openai_api_key');
        const model = localStorage.getItem('openai_model');

        if (!apiKey || !model) {
            setApiKeyAndModel();
            return "Please set up your API key and model first.";
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [...conversationHistory.slice(-4), { role: 'user', content: prompt }],
                    max_tokens: 2000
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
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
            console.error('OpenAI API error:', error);
            return "Sorry, I couldn't get a response.";
        }
    }

    function setApiKeyAndModel() {
        const apiKey = prompt("Enter your OpenAI API Key:");
        const model = prompt("Enter the model (e.g., gpt-4):");

        if (apiKey && model) {
            localStorage.setItem('openai_api_key', apiKey);
            localStorage.setItem('openai_model', model);
            alert("Settings saved!");
        }
    }

    // Code execution functions
    window.executeCode = async function(code) {
        try {
            console.log = customConsole.log;
            console.error = customConsole.error;
            return await eval.call(window, code);
        } catch (error) {
            customConsole.error(error);
        } finally {
            console.log = originalConsole.log;
            console.error = originalConsole.error;
        }
    };

    window.executeCodeFromButton = async function(outputId, button) {
        const codeElement = button.parentElement.querySelector('code');
        const outputElement = document.getElementById(outputId);
        const code = codeElement.textContent;

        outputElement.style.display = 'block';
        outputElement.textContent = '';
        currentOutputElement = outputElement;

        const result = await executeCode(code);
        if (result !== undefined) {
            customConsole.log(result);
        }

        currentOutputElement = null;
    };
});
